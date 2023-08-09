#!/bin/zsh

cd ../../..

ts_dependency_graph --hotspots --agg --graph_folder --max_depth=1 --start public/app/features/explore/Logs/LogsContainer.tsx | dot -Tpng -odocs/dev/logs/logs-container-1.png -v -Kfdp

ts_dependency_graph --hotspots --agg --graph_folder --max_depth=2 --start public/app/features/explore/Logs/LogsContainer.tsx | dot -Tpng -odocs/dev/logs/logs-container-2.png -v -Kfdp

ts_dependency_graph --hotspots --agg --graph_folder --max_depth=3 --start public/app/features/explore/Logs/LogsContainer.tsx | dot -Tpng -odocs/dev/logs/logs-container-3.png -v -Kfdp

cd -
