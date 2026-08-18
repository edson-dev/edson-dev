SHELL := cmd
PORT ?= 8080

.PHONY: run serve fetch data icons all help

all: help

help:
	@echo "Targets:"
	@echo "  make run      - refresh data snapshots then serve locally at http://localhost:$(PORT)"
	@echo "  make data     - refresh data/*.json snapshots from the GitHub API"
	@echo "  make fetch    - alias for data"
	@echo "  make icons    - re-download images/ tech icons"
	@echo "  make help     - this help"

run: data serve

data: fetch

serve:
	node scripts/server.mjs

fetch:
	node scripts/fetch.mjs

icons:
	powershell -NoProfile -ExecutionPolicy Bypass -File scripts\fetch-icons.ps1
