// Copyright 2021 Grafana Labs
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package grafanaplugin

import (
	"github.com/grafana/grafana/packages/grafana-schema/src/common"
)

composableKinds: PanelCfg: {
	maturity: "experimental"

	lineage: {
		seqs: [
			{
				schemas: [
					{
						PanelOptions: {
							common.SingleStatBaseOptions
							graphMode:   common.BigValueGraphMode | *"area"
							colorMode:   common.BigValueColorMode | *"value"
							justifyMode: common.BigValueJustifyMode | *"auto"
							textMode:    common.BigValueTextMode | *"auto"

							// The first matching test will be used to override display values 
							// TORN if this should be panel or field config... field config conceptually better, but:
							// an panel config we get:
							// - more efficient setup/execution with multiple fields
							// - nested options are suported for panels (not yet for fields)
							conditions?: [...ConditionalDisplay]
						} @cuetsy(kind="interface")

						ConditionalDisplay: {
							test:    ConditionTest
							display: CustomDisplayValue
						} @cuetsy(kind="interface")

						ConditionTestMode: "value" | "field" | "true" @cuetsy(kind="enum")

						// Check if the condition should be used
						ConditionTest: {
							mode:     ConditionTestMode | *"value"
							field?:   string // only used when mode == field
							reducer?: string
							op:       common.ComparisonOperation | "gte"
							value?:   number | string | bool
						} @cuetsy(kind="interface")

						// Optionally the calculated DisplayValue
						CustomDisplayValue: {
							text?:   string
							prefix?: string
							suffix?: string
							color?:  string
						} @cuetsy(kind="interface")
					},
				]
			},
		]
	}
}
