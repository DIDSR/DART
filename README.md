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
     - [ ] read provided file/dictionary
   - [x] Attribute Types (configuration)
     - [x] Categorical
     - [x] Numeric
   - [x] Encode Attributes into Basis Hypervector Sets
     - [ ] Validate expected similarities
   - [x] Encode samples into single hypervectors
     - [x] Validate extract correct values
   - [x] ~~Encode *all* samples into single representative dataset hypervector~~ ***postponed****
     - [ ] ~~Validate extract sample information~~ ***postponed****
 - [x] **Comparison**
   - [x] Receive user comparison request (file/dictionary)
   - [ ] ~~Query Specific samples from dataset hypervector~~ ***postponed****
   - [x] Measure needed similarity values
   - [ ] Output format: visual
   - [x] Output format: quantitative
 - [ ] **Pipeline:** singular pipeline script to run through the entire process, with all needed information provided up front
  > *Bundling all of the samples into a single representative hypervector would be ideal (as it would mean that we wouldn't need to hold all of the samples in memory, and could instead query all the needed values out of one stored hypervector), but I haven't found a way to do the encoding that doesn't introduce too much noise to be able to accurately retreive the input values, may not be feasible with large complex datasets.

