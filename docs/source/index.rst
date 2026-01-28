DAta RepresenTativeness
=======================

:abbr:`DART (DAta RepresenTativeness)` uses **hyperdimensional computing** to quantitatively assess the distribution match of sample metadata (attributes) between different populations (or subpopulations).

Getting Started
---------------

Required input
^^^^^^^^^^^^^^

The only input required to use :abbr:`DART (DAta RepresenTativeness)` is a pandas :class:`DataFrame` containing a dataset's sample information.
The DataFrame should be organized such that every row represents a distinct sample and each column represents an :abbr:`attribute (distinct piece of metadata information)`.


.. important:: The current version of DART does not have a way to resolve samples with missing information.
    All samples missing information for one or more attributes will be removed from the dataset prior to encoding.

.. note:: The measures of dataset similarity used in DART are based on attribute *distribution* and do not depend on the number of samples.
    Therefore, the two datasets shown in the table below would be considered equivalent. 
    Reducing the number of samples in datasets to the minimum needed to accurately represent the dataset distribution can improve processing time for extremely large datasets.

    .. rst-class:: column-table
    .. list-table::
       :widths: 50 50
       :header-rows: 0

       * - .. list-table:: Full dataset
              :header-rows: 1
              
              * - Population
                - Disease Status
              * - A
                - Positive
              * - A
                - Positive
              * - B
                - Negative
              * - B
                - Negative
              * - B
                - Negative
              * - B
                - Negative
              
         - .. list-table:: Reduced dataset
              :header-rows: 1

              * - Population
                - Disease Status
              * - A
                - Positive
              * - B
                - Negative
              * - B
                - Negative
    

Constructing a dataset
^^^^^^^^^^^^^^^^^^^^^^
Simply provide the DataFrame containing sample attribute information to the :class:`DART.Dataset` class to create a :class:`Dataset` with default attribute configurations. 
Specifying custom configurations is not currently supported, but is planned for a future version of DART.

Running comparisons
^^^^^^^^^^^^^^^^^^^
Comparisons can be run with a constructed :class:`Dataset` using :meth:`Dataset.compare`. The first two arguments (:code:`criteria1` and :code:`criteria2`) are dictionaries used to define the two groups that will be compared.
For example, the attribute distributionsof B and A samples could be compared using :code:`Dataset.compare({"Population":"B"}, {"Population":"A"})`. See :meth:`~DART.Dataset.compare` for optional arguments.



Contents
--------
.. toctree::
   :maxdepth: 2

   self
   HDC
   example
   DART
