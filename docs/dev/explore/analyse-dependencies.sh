#!/bin/zsh

cd ../../..

ts_dependency_graph --hotspots --agg --graph_folder --max_depth=1 --filter="features/explore,NOT features/explore/state/main" --start public/app/features/explore/state/main.ts | dot -Tpng -odocs/dev/explore/explore-state-1.png -v -Kfdp

ts_dependency_graph --hotspots --agg --graph_folder --max_depth=2 --filter="features/explore,NOT features/explore/state/main" --start public/app/features/explore/state/main.ts | dot -Tpng -odocs/dev/explore/explore-state-2.png -v -Kfdp

ts_dependency_graph --hotspots --agg --graph_folder --max_depth=3 --filter="features/explore,NOT features/explore/state/main" --start public/app/features/explore/state/main.ts | dot -Tpng -odocs/dev/explore/explore-state-3.png -v -Kfdp

ts_dependency_graph --hotspots --max_depth=3 --filter="features/explore,NOT features/explore/state/main" --start public/app/features/explore/state/main.ts | dot -Tpng -odocs/dev/explore/explore-state-3-details.png -v

ts_dependency_graph --hotspots --agg --graph_folder --max_depth=1 --filter="features/explore,NOT features/explore/ExplorePage.tsx" --start public/app/features/explore/ExplorePage.tsx | dot -Tpng -odocs/dev/explore/explore-ui-1.png -v -Kfdp

ts_dependency_graph --hotspots --agg --graph_folder --max_depth=2 --filter="features/explore,NOT features/explore/ExplorePage.tsx" --start public/app/features/explore/ExplorePage.tsx | dot -Tpng -odocs/dev/explore/explore-ui-2.png -v -Kfdp

ts_dependency_graph --hotspots --agg --graph_folder --max_depth=3 --filter="features/explore,NOT features/explore/ExplorePage.tsx" --start public/app/features/explore/ExplorePage.tsx | dot -Tpng -odocs/dev/explore/explore-ui-3.png -v -Kfdp

cd -
