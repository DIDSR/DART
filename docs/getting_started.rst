Getting Started
===============

Required input
--------------

The only input required to use :abbr:`DART (DAta RepresenTativeness)` is a pandas :class:`DataFrame` containing the sample information of your dataset.
The DataFrame should be organized such that every row represents a distinct sample and each column represents an :abbr:`attribute (a distinct piece of metadata information)`.

.. important:: The current version of DART does not have a way to resolve samples with missing information.
    All samples missing information for one or more attributes will be removed from the dataset prior to encoding.

.. note:: The measures of dataset similarity used in DART are based on attribute *distribution* and do not depend on the number of samples.
    Therefore, the two datasets shown in the table below would be considered equivalent. 
    Reducing the number of samples in datasets to the minimum needed to accurately represent the dataset distribution can improve processing time for extremely large datasets.

    .. list-table:: Full dataset
        :header-rows: 1
        :widths: 10 10
        
        * - Sex
          - Disease Status
        * - Female
          - Positive
        * - Female
          - Positive
        * - Male
          - Negative
        * - Male
          - Negative
        * - Male
          - Negative
        * - Male
          - Negative
    
    .. list-table:: Reduced dataset
        :header-rows: 1
        :widths: 10 10
        
        * - Sex
          - Disease Status
        * - Female
          - Positive
        * - Male
          - Negative
        * - Male
          - Negative

        
Constructing a dataset
----------------------
Simply provide the DataFrame containing your samples' attribute information to the :class:`DART.Dataset` class to create a :class:`Dataset` with default attribute configurations. 
Specifying custom configurations is not currently supported, but is planned for a future version of DART.

Running comparisons
-------------------
Comparisons can be run with a constructed :class:`Dataset` using :meth:`Dataset.compare`. The first two arguments (:code:`criteria1` and :code:`criteria2`) are dictionaries used to define the two groups that you wish to compare.
For example, the attribute distributionsof Male and Female samples could be compared using :code:`Dataset.compare({"sex":"Male"}, {"sex":"Female"})`. See :meth:`~DART.Dataset.compare` for optional arguments.