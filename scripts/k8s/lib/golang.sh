#!/usr/bin/env bash

# Copyright 2014 The Kubernetes Authors.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# shellcheck disable=SC2034 # Variables sourced in other scripts.

# The golang package that we are building.
readonly GRAFANA_GO_PACKAGE=github.com/grafana/grafana
readonly GRAFANA_GOPATH="${GRAFANA_GOPATH:-"${KUBE_OUTPUT}/go"}"
export GRAFANA_GOPATH

# ------------
# NOTE: All functions that return lists should use newlines.
# bash functions can't return arrays, and spaces are tricky, so newline
# separators are the preferred pattern.
# To transform a string of newline-separated items to an array, use kube::util::read-array:
# kube::util::read-array FOO < <(kube::golang::dups a b c a)
#
# ALWAYS remember to quote your subshells. Not doing so will break in
# bash 4.3, and potentially cause other issues.
# ------------

# Returns a sorted newline-separated list containing only duplicated items.
kube::golang::dups() {
  # We use printf to insert newlines, which are required by sort.
  printf "%s\n" "$@" | sort | uniq -d
}

# Returns a sorted newline-separated list with duplicated items removed.
kube::golang::dedup() {
  # We use printf to insert newlines, which are required by sort.
  printf "%s\n" "$@" | sort -u
}

# Create the GOPATH tree under $KUBE_OUTPUT
kube::golang::create_gopath_tree() {
  local go_pkg_dir="${GRAFANA_GOPATH}/src/${GRAFANA_GO_PACKAGE}"
  local go_pkg_basedir
  go_pkg_basedir=$(dirname "${go_pkg_dir}")

  mkdir -p "${go_pkg_basedir}"

  # TODO: This symlink should be relative.
  if [[ ! -e "${go_pkg_dir}" || "$(readlink "${go_pkg_dir}")" != "${GRAFANA_ROOT}" ]]; then
    ln -snf "${GRAFANA_ROOT}" "${go_pkg_dir}"
  fi
}

# Ensure the go tool exists and is a viable version.
# Inputs:
#   env-var GO_VERSION is the desired go version to use, downloading it if needed (defaults to content of .go-version)
#   env-var FORCE_HOST_GO set to a non-empty value uses the go version in the $PATH and skips ensuring $GO_VERSION is used
kube::golang::verify_go_version() {
  # default GO_VERSION to content of .go-version
  GO_VERSION="${GO_VERSION:-"$(cat "${GRAFANA_ROOT}/.go-version")"}"
  if [ "${GOTOOLCHAIN:-auto}" != 'auto' ]; then
    # no-op, just respect GOTOOLCHAIN
    :
  elif [ -n "${FORCE_HOST_GO:-}" ]; then
    # ensure existing host version is used, like before GOTOOLCHAIN existed
    export GOTOOLCHAIN='local'
  else
    # otherwise, we want to ensure the go version matches GO_VERSION
    GOTOOLCHAIN="go${GO_VERSION}"
    export GOTOOLCHAIN
    # if go is either not installed or too old to respect GOTOOLCHAIN then use gimme
    if ! (command -v go >/dev/null && [ "$(go version | cut -d' ' -f3)" = "${GOTOOLCHAIN}" ]); then
      export GIMME_ENV_PREFIX=${GIMME_ENV_PREFIX:-"${KUBE_OUTPUT}/.gimme/envs"}
      export GIMME_VERSION_PREFIX=${GIMME_VERSION_PREFIX:-"${KUBE_OUTPUT}/.gimme/versions"}
      # eval because the output of this is shell to set PATH etc.
      eval "$("${GRAFANA_ROOT}/third_party/gimme/gimme" "${GO_VERSION}")"
    fi
  fi

  if [[ -z "$(command -v go)" ]]; then
    cat <<EOF
Can't find 'go' in PATH, please fix and retry.
See http://golang.org/doc/install for installation instructions.
EOF
    return 2
  fi

  local go_version
  IFS=" " read -ra go_version <<< "$(GOFLAGS='' go version)"
  local minimum_go_version
  minimum_go_version=go1.21
  if [[ "${minimum_go_version}" != $(echo -e "${minimum_go_version}\n${go_version[2]}" | sort -s -t. -k 1,1 -k 2,2n -k 3,3n | head -n1) && "${go_version[2]}" != "devel" ]]; then
    cat <<EOF
Detected go version: ${go_version[*]}.
Kubernetes requires ${minimum_go_version} or greater.
Please install ${minimum_go_version} or later.
EOF
    return 2
  fi
}

# kube::golang::setup_env will check that the `go` commands is available in
# ${PATH}. It will also check that the Go version is good enough for the
# Kubernetes build.
#
# Outputs:
#   env-var GOPATH points to our local output dir
#   env-var GOBIN is unset (we want binaries in a predictable place)
#   env-var GO15VENDOREXPERIMENT=1
#   current directory is within GOPATH
kube::golang::setup_env() {
  #kube::golang::verify_go_version

  # Set up GOPATH.  We have tools which depend on being in a GOPATH (see
  # hack/run-in-gopath.sh).
  #
  # Even in module mode, we need to set GOPATH for `go build` and `go install`
  # to work.  We build various tools (usually via `go install`) from a lot of
  # scripts.
  #   * We can't set GOBIN because that does not work on cross-compiles.
  #   * We could use `go build -o <something>`, but it's subtle when it comes
  #     to cross-compiles and whether the <something> is a file or a directory,
  #     and EVERY caller has to get it *just* right.
  #   * We could leave GOPATH alone and let `go install` write binaries
  #     wherever the user's GOPATH says (or doesn't say).
  #
  # Instead we set it to a phony local path and process the results ourselves.
  # In particular, GOPATH[0]/bin will be used for `go install`, with
  # cross-compiles adding an extra directory under that.
  #
  # Eventually, when we no longer rely on run-in-gopath.sh we may be able to
  # simplify this some.
  kube::golang::create_gopath_tree
  export GOPATH="${GRAFANA_GOPATH}"

  # If these are not set, set them now.  This ensures that any subsequent
  # scripts we run (which may call this function again) use the same values.
  export GOCACHE="${GOCACHE:-"${GRAFANA_GOPATH}/cache/build"}"
  export GOMODCACHE="${GOMODCACHE:-"${GRAFANA_GOPATH}/cache/mod"}"

  # Make sure our own Go binaries are in PATH.
  export PATH="${GRAFANA_GOPATH}/bin:${PATH}"

  # Change directories so that we are within the GOPATH.  Some tools get really
  # upset if this is not true.  We use a whole fake GOPATH here to collect the
  # resultant binaries.
  local subdir
  subdir=$(kube::realpath . | sed "s|${GRAFANA_ROOT}||")
  cd "${GRAFANA_GOPATH}/src/${GRAFANA_GO_PACKAGE}/${subdir}" || return 1

  # Set GOROOT so binaries that parse code can work properly.
  GOROOT=$(go env GOROOT)
  export GOROOT

  # Unset GOBIN in case it already exists in the current session.
  # Cross-compiles will not work with it set.
  unset GOBIN

  # This seems to matter to some tools
  export GO15VENDOREXPERIMENT=1
}
