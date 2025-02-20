# Configuration file for the Sphinx documentation builder.
#
# For the full list of built-in configuration values, see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Add DART module to the path ---------------------------------------------
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.resolve()))


# -- Project information -----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#project-information

project = 'DART'
copyright = '2025, Alexis Burgon and Ravi Samala'
author = 'Alexis Burgon and Ravi Samala'

# -- General configuration ---------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#general-configuration

extensions = [
    "sphinx.ext.napoleon",
    "sphinx.ext.autosectionlabel",
]

templates_path = ['_templates']
exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store']

# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output

html_theme = 'alabaster'
html_theme_options = { # options available depend on the theme used
    "github_user": "DIDSR",
    "github_repo": "DART",
    "description": "Quantitative DAta RepresenTativeness measurment"
}

html_static_path = ['_static']
