package kind

import "strings"

name:        "Folder"
maturity:    "merged"
description: "folder element"

lineage: seqs: [
	{
		schemas: [
			// 0.0
			{
				// Folder UID
				uid: string @grafanamaturity(ToMetadata="sys")

				// Folder title (must be unique within the parent folder)
				title: string & strings.MinRunes(1)
			},
		]
	},
]
