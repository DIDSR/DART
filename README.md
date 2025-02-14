# DAta RepresenTativeness (DART)

DART is a python package designed to facilitate measuring dataset distribution matches through the use of hyperdimensional computing.
This is done by encoding attribute (metadata) information into hypervectors (high-dimensional vectors), which can then be combined to represent individual samples or entire datasets/populations.


## Implementation Progress

 - [ ] **Setup**
   - [ ] Read data file input
     - [x] csv
     - [x] tsv
     - [ ] json
   - [ ] Attribute Configuration
     - [x] get default
     - [ ] read provided file
   - [x] Attribute Types (configuration)
     - [x] Categorical
     - [x] Numeric
   - [x] Encode Attributes into Basis Hypervector Sets
     - [ ] Validate expected similarities
   - [x] Encode samples into single hypervectors
     - [ ] Validate extract correct values
   - [x] Encode *all* samples into single representative dataset hypervector
     - [ ] Validate extract sample information
 - [ ] **Comparison**
   - [ ] Receive user comparison request (file/dictionary)
   - [ ] Query Specific samples from dataset hypervector
   - [ ] Measure needed similarity values
   - [ ] Output format: visual
   - [ ] Output format: quantitative
   - [ ] Save outputs
 - [ ] **Pipeline:** singular pipeline script to run through the entire process, with all needed information provided up front

