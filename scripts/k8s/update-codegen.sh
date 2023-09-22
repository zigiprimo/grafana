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

# shellcheck disable=2046 # printf word-splitting is intentional

set -o errexit
set -o nounset
set -o pipefail

# This tool wants a different default than usual.
KUBE_VERBOSE="${KUBE_VERBOSE:-10}"

GRAFANA_ROOT=$(dirname "${BASH_SOURCE[0]}")/../..
source "${GRAFANA_ROOT}/scripts/k8s/lib/init.sh"
cd "${GRAFANA_ROOT}"

kube::golang::setup_env

DBG_CODEGEN="${DBG_CODEGEN:-0}"
GENERATED_FILE_PREFIX="${GENERATED_FILE_PREFIX:-zz_generated.}"
UPDATE_API_KNOWN_VIOLATIONS="${UPDATE_API_KNOWN_VIOLATIONS:-}"
API_KNOWN_VIOLATIONS_DIR="${API_KNOWN_VIOLATIONS_DIR:-"${GRAFANA_ROOT}/api/api-rules"}"

PRJ_SRC_PATH="github.com/grafana/grafana"
BOILERPLATE_FILENAME="scripts/k8s/boilerplate/boilerplate.generatego.txt"

# Any time we call sort, we want it in the same locale.
export LC_ALL="C"

# Work around for older grep tools which might have options we don't want.
unset GREP_OPTIONS

if [[ "${DBG_CODEGEN}" == 1 ]]; then
    kube::log::status "DBG: starting generated_files"
fi

function git_find() {
    # Similar to find but faster and easier to understand.  We want to include
    # modified and untracked files because this might be running against code
    # which is not tracked by git yet.
    git ls-files -cmo --exclude-standard ':!:vendor/*' "$@"
}

function git_grep() {
    # We want to include modified and untracked files because this might be
    # running against code which is not tracked by git yet.
    # We need vendor exclusion added at the end since it has to be part of
    # the pathspecs which are specified last.
    git grep --untracked "$@" ':!:vendor/*'
}

# Generate a list of all files that have a `+k8s:` comment-tag.  This will be
# used to derive lists of files/dirs for generation tools.
#
# We want to include the "special" vendor directories which are actually part
# of the Kubernetes source tree (staging/*) but we need them to be named as
# their vendor/* equivalents.  We do not want all of vendor nor
# hack/tools/vendor nor even all of vendor/k8s.io - just the subset that lives
# in staging.
if [[ "${DBG_CODEGEN}" == 1 ]]; then
    kube::log::status "DBG: finding all +k8s: tags"
fi
ALL_K8S_TAG_FILES=()
kube::util::read-array ALL_K8S_TAG_FILES < <(
    git_grep -l \
        -e '^// *+k8s:'                `# match +k8s: tags` \
        -- \
        ':!:*/testdata/*'              `# not under any testdata` \
        ':(glob)**/*.go'               `# in any *.go file` \
    )
if [[ "${DBG_CODEGEN}" == 1 ]]; then
    kube::log::status "DBG: found ${#ALL_K8S_TAG_FILES[@]} +k8s: tagged files"
fi

#
# Code generation logic.
#

# Deep-copy generation
#
# Any package that wants deep-copy functions generated must include a
# comment-tag in column 0 of one file of the form:
#     // +k8s:deepcopy-gen=<VALUE>
#
# The <VALUE> may be one of:
#     generate: generate deep-copy functions into the package
#     register: generate deep-copy functions and register them with a
#               scheme
function codegen::deepcopy() {
    GO111MODULE=on go install \
        k8s.io/code-generator/cmd/deepcopy-gen@v0.27.1

    # The result file, in each pkg, of deep-copy generation.
    local output_base="${GENERATED_FILE_PREFIX}deepcopy"

    # The tool used to generate deep copies.
    local gen_deepcopy_bin
    gen_deepcopy_bin="$(kube::util::find-binary "deepcopy-gen")"

    # Find all the directories that request deep-copy generation.
    if [[ "${DBG_CODEGEN}" == 1 ]]; then
        kube::log::status "DBG: finding all +k8s:deepcopy-gen tags"
    fi
    local tag_dirs=()
    kube::util::read-array tag_dirs < <( \
        grep -l --null '+k8s:deepcopy-gen=' "${ALL_K8S_TAG_FILES[@]}" \
            | xargs -0 -n1 dirname \
            | sort -u)
    if [[ "${DBG_CODEGEN}" == 1 ]]; then
        kube::log::status "DBG: found ${#tag_dirs[@]} +k8s:deepcopy-gen tagged dirs"
    fi

    local tag_pkgs=()
    for dir in "${tag_dirs[@]}"; do
        tag_pkgs+=("./$dir")
    done

    kube::log::status "Generating deepcopy code for ${#tag_pkgs[@]} targets"
    if [[ "${DBG_CODEGEN}" == 1 ]]; then
        kube::log::status "DBG: running ${gen_deepcopy_bin} for:"
        for dir in "${tag_dirs[@]}"; do
            kube::log::status "DBG:     $dir"
        done
    fi

    git_find -z ':(glob)**'/"${output_base}.go" | xargs -0 rm -f

    go get

    ./scripts/k8s/run-in-gopath.sh "${gen_deepcopy_bin}" \
        --v "${KUBE_VERBOSE}" \
        --logtostderr \
        -h "${BOILERPLATE_FILENAME}" \
        -O "${output_base}" \
        $(printf -- " -i %s" "${tag_pkgs[@]}") \
        "$@"

    if [[ "${DBG_CODEGEN}" == 1 ]]; then
        kube::log::status "Generated deepcopy code"
    fi
}

# main
#

function list_codegens() {
    (
        shopt -s extdebug
        declare -F \
            | cut -f3 -d' ' \
            | grep "^codegen::" \
            | while read -r fn; do declare -F "$fn"; done \
            | sort -n -k2 \
            | cut -f1 -d' ' \
            | sed 's/^codegen:://'
    )
}

# shellcheck disable=SC2207 # safe, no functions have spaces
all_codegens=($(list_codegens))

function print_codegens() {
    echo "available codegens:"
    for g in "${all_codegens[@]}"; do
        echo "    $g"
    done
}

# Validate and accumulate flags to pass thru and codegens to run if args are
# specified.
flags_to_pass=()
codegens_to_run=()
for arg; do
    # Use -? to list known codegens.
    if [[ "${arg}" == "-?" ]]; then
        print_codegens
        exit 0
    fi
    if [[ "${arg}" =~ ^- ]]; then
        flags_to_pass+=("${arg}")
        continue
    fi
    # Make sure each non-flag arg matches at least one codegen.
    nmatches=0
    for t in "${all_codegens[@]}"; do
        if [[ "$t" =~ ${arg} ]]; then
            nmatches=$((nmatches+1))
            # Don't run codegens twice, just keep the first match.
            # shellcheck disable=SC2076 # we want literal matching
            if [[ " ${codegens_to_run[*]} " =~ " $t " ]]; then
                continue
            fi
            codegens_to_run+=("$t")
            continue
        fi
    done
    if [[ ${nmatches} == 0 ]]; then
        echo "ERROR: no codegens match pattern '${arg}'"
        echo
        print_codegens
        exit 1
    fi
    # The array-syntax abomination is to accommodate older bash.
    codegens_to_run+=("${matches[@]:+"${matches[@]}"}")
done

# If no codegens were specified, run them all.
if [[ "${#codegens_to_run[@]}" == 0 ]]; then
    codegens_to_run=("${all_codegens[@]}")
fi

for g in "${codegens_to_run[@]}"; do
    # The array-syntax abomination is to accommodate older bash.
    "codegen::${g}" "${flags_to_pass[@]:+"${flags_to_pass[@]}"}"
done
