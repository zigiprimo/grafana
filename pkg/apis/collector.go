package apis

// This is used to collect all the apis before starting the api-server
type GroupBuilderCollection interface {
	AddAPI(b APIGroupBuilder) error
	GetAPIs() []APIGroupBuilder
}

func ProvideGroupBuilderCollection() GroupBuilderCollection {
	return &builderCollection{
		builders: make([]APIGroupBuilder, 0),
	}
}

type builderCollection struct {
	builders []APIGroupBuilder
}

func (c *builderCollection) AddAPI(b APIGroupBuilder) error {
	c.builders = append(c.builders, b)
	return nil
}

func (c *builderCollection) GetAPIs() []APIGroupBuilder {
	return c.builders
}
