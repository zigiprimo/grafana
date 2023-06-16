package entity

import (
	"fmt"
	"regexp"
	"strconv"
)

var grnRegexp = regexp.MustCompile(`^grn:(\d+)/([^/]+)/([^/]+)$`)

// Check if the two GRNs reference to the same object
// we can not use simple `*x == *b` because of the internal settings
func (x *GRN) Equals(b *GRN) bool {
	if b == nil {
		return false
	}
	return x == b || (x.TenantId == b.TenantId &&
		x.Kind == b.Kind &&
		x.UID == b.UID)
}

// Set an OID based on the GRN
func (x *GRN) ToGRNString() string {
	return fmt.Sprintf("grn:%d/%s/%s", x.TenantId, x.Kind, x.UID)
}

func (x *GRN) Parse(raw string) error {
	match := grnRegexp.FindStringSubmatch(raw)
	if match == nil {
		return fmt.Errorf("invalid GRN value: %s", raw)
	}
	tenantId, err := strconv.ParseInt(match[1], 10, 64)
	if err != nil {
		return fmt.Errorf("invalid GRN tenant id value: %s", raw)
	}
	x.TenantId = tenantId
	x.Kind = match[2]
	x.UID = match[3]
	return nil
}

// implements sql.Scanner
func (x *GRN) Scan(src interface{}) error {
	if src == nil {
		return nil
	}
	if s, ok := src.(string); ok {
		return x.Parse(s)
	}
	return fmt.Errorf("invalid GRN value: %v", src)
}
