package passwordimpl

import (
	"github.com/grafana/grafana/pkg/services/password"
	"github.com/grafana/grafana/pkg/setting"
)

type service struct {
	cfg *setting.Cfg
}

func ProvideService(cfg *setting.Cfg) password.Service {
	return &service{cfg: cfg}
}

func (s *service) Validators() []password.ComplexityValidator {
	section := s.cfg.SectionWithEnvOverrides("security.passwords")
	minLen := section.Key("min_length").MustInt(4)
	maxRep := section.Key("max_repetition").MustInt(0)
	minComplexity := section.Key("min_complexity").MustInt(0)

	var validators []password.ComplexityValidator
	if minLen != 0 {
		validators = append(validators, password.MinLengthCheck(minLen))
	}
	if maxRep != 0 {
		validators = append(validators, password.Repetition(maxRep))
	}
	if minComplexity != 0 {
		validators = append(validators, password.CharacterComplexity(minComplexity))
	}
	return validators
}

func (s *service) ValidatePassword(pwd []rune) error {
	p := password.Password{
		Password:   pwd,
		Validators: s.Validators(),
	}
	return p.Validate()
}
