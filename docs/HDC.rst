Why hyperdimensional computing?
===============================

:abbr:`DART (DAta RepresenTativeness)` uses hyperdimensional computing (HDC) to measure data distribution match for several reasons:

#. Provides a quantitative measurement of similarity
#. Allows for the encoding of different attribute types

Attribute Types
---------------
:abbr:`HDC (hyperdimensional computing)` allows for the creation of hypervectors with varying degrees of similarity to each other.
This allows for a distinction between attributes where there is no inherent similarity between different values (e.g., categorical) and attributes where different values 
may have varying degrees of similarity with each other (e.g., numeric).

.. rst-class:: image-table
.. list-table::
    :widths: 50 50
    :header-rows: 0

    * - .. figure:: _static/images/categorical_set_similarity.png
           :alt: A heatmap showing the intra-set similarity between five values of a categorical attribute: "A", "B", "C", "D" and "E". The similarity between each value and itself is 1, and the similarity between any two different values is approximately 0.
      - .. figure:: _static/images/numeric_set_similarity.png
           :alt: A heatmap showing the intra-set similarity between five values of a numeric attribute with values ranging from 1 to 5. The similarity between the representations of 1 and 5 is 0, and the similarity increases as the numbers get closer to each other in value (e.g., the similarity between the representation of 1 and 2 is 0.75).
    * - The similarity between any two unique values of a categorical attribute is approximately 0. 
        The similarity between any hypervector representation and itself is always 1.
      - The similarity values between any two numeric attribute values depend on their relative value.
        The values representing the minimum and maximum values (1 and 5, respectively) have a similarity of approximately 0.

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

If we wanted to measure the population similarities using a distribution similarity measurement like Jenson-Shannon distance (JSD), 
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
      - Cosine similarity (HDC)
    * - ii
      - 0.833
      - 0.016
    * - iii
      - 0.833
      - 0.254

