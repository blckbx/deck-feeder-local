path_scripts = $(realpath ../../dev/scripts)
path_bitcoinstats = $(realpath .)

.PHONY: build-svg-atlas
build-svg-atlas:
	echo $(path_scripts)
	echo $(path_bitcoinstats)

	yarn tsx "$(path_scripts)/build-svg-atlas.ts" \
		"$(path_bitcoinstats)/icons/source" \
		"$(path_bitcoinstats)/icons/atlas.svg"