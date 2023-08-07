#!/bin/zsh

cd ../../..

ts_dependency_graph --hotspots --agg --graph_folder --max_depth=1 --start public/app/features/correlations | dot -Tpng -odocs/dev/correlations/correlations-1.png -v -Kfdp

ts_dependency_graph --hotspots --agg --graph_folder --max_depth=2 --start public/app/features/correlations | dot -Tpng -odocs/dev/correlations/correlations-2.png -v -Kfdp

ts_dependency_graph --hotspots --agg --graph_folder --max_depth=3 --start public/app/features/correlations | dot -Tpng -odocs/dev/correlations/correlations-3.png -v -Kfdp

cd -
