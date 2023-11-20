package util

import "path/filepath"

// CleanRelativePath returns the shortest path name equivalent to path
// by purely lexical processing. It makes sure the provided path is rooted
// and then uses filepath.Clean and filepath.Rel to make sure the path
// doesn't include any separators or elements that shouldn't be there
// like ., .., //.
func CleanRelativePath(path string) (string, error) {
	cleanPath := filepath.Clean(filepath.Join("/", path))
	rel, err := filepath.Rel("/", cleanPath)
	if err != nil {
		// slash is prepended above therefore this is not expected to fail
		return "", err
	}

	return rel, nil
}
