Why hyperdimensional computing?
===============================

:abbr:`DART (DAta RepresenTativeness)` uses hyperdimensional computing (HDC) to measure data distribution match for several reasons:

#. Provides a quantitative measurement of similarity
#. Allows for the encoding of different attribute types

Attribute Types
---------------
:abbr:`HDC (hyperdimensional computing)` allows for the creation of hypervectors with varying degrees of similarity to each other.
To illustrate the importance of this property, let's consider a simple toy attribute that can have the values 1, 2, 3, 4 or 5. 
Suppose we want to measure the similarity of the "population i" to the other two "populations" shown in the table below.

.. list-table::
    :widths: 10 20
    :header-rows: 1

    * - Population
      - Population values
    * - i
      - 2
    * - ii
      - 5
    * - iii
      - 3

If we wanted to measure the population similarities using a distribution similarity measurement like jenson-shannon distance (JSD), 
then we would need to convert each population into a probability distribution, 
while to use :abbr:`HDC (hyperdimensional computing)` we would encode each population into a :abbr:`hypervector (hyperdimensional vector)` (which have been shortened in the table below).

.. list-table::
    :widths: 10 20 20
    :header-rows: 1

    * - Population
      - Probability distribution
      - hypervector
    * - i
      - [0, 1, 0, 0, 0]
      - [-1, -1, -1, ..., 1, 1, -1]
    * - ii
      - [0, 0, 0, 0, 1]
      - [1, 1, -1, ..., 1, 1, 1]
    * - iii
      - [0, 0, 1, 0, 0]
      - [-1, 1, -1, ..., 1, 1, -1]

In both these approachs we can now measure the distribution similarity to determine which of the other two "populations" are the most similar to "population i". 
This is accomplished using :abbr:`JSD (jenson-shannon distance)` to measure the similarity of the probability distributions and 
cosine similarity to measure :abbr:`hypervector (hyperdimensional vector)` similarity.

.. list-table:: Similarity to "population i"
    :widths: 10 20 20
    :header-rows: 1

    * - Population
      - Jenson-Shannon distance
      - cosine similarity (HDC)
    * - ii
      - 0.833
      - 0.016
    * - iii
      - 0.833
      - 0.254