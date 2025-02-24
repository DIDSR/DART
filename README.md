# DAta RepresenTativeness (DART)

DART is a python package which facilitates distributional similarity measurements at both population and subpopulation levels. 
DART encodes attribute (metadata) information into hypervectors (high-dimensional vectors) which can then be used combined to represent individual samples or entire datasets following the principles of hyperdimensional computing.

Hyperdimensional computing allows for the nuanced representation of different attribute types through the creation of hypervectors with varying amounts of similarity to each other.
This enables proper representation of different types of attributes, such as drawing a distinction between categorical attributes (for which distinct values have no inherent similarity) and numeric attributes (for which the inherent similarity between any two values depends on their difference).

More information can be found in the [DART documentation] (**link to be added upon GitHub pages release**) and a full implementation example can be found in the [test notebook](https://github.com/DIDSR/DART/blob/main/test.ipynb).

## Installation
### GitHub
1. clone this repository
2. install dependencies (run from the root directory of this project):
  - If you would like to run [`test.ipynb`](test.ipynb): ``` pip install ".[test]" ```
  - If you just want to install the DART package: ``` pip install "." ```