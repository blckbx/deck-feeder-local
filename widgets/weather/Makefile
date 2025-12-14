path_scripts = $(realpath ../../dev/scripts)
path_weather = $(realpath .)

.PHONY: build-svg-atlas
build-svg-atlas:
	echo $(path_scripts)
	echo $(path_weather)

	yarn tsx "$(path_scripts)/build-svg-atlas.ts" \
		"$(path_weather)/icons/source" \
		"$(path_weather)/icons/atlas.svg"
