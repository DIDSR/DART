# DAta RepresenTativeness (DART)

DART is a python package which facilitates distributional similarity measurements at both population and subpopulation levels.

![{DART overview image}]("./docs/DART_overview_image.png")

---

> [!NOTE]
> The detailed documentation for this repository can be accessed at {LINK TO HOSTED DOCUMENTATION}

# Overview
DART encodes attribute (metadata) information into hypervectors (high-dimensional vectors) which can then be used combined to represent individual samples or entire datasets following the principles of hyperdimensional computing.

Hyperdimensional computing allows for the nuanced representation of different attribute types through the creation of hypervectors with varying amounts of similarity to each other.
This enables proper representation of different types of attributes, such as drawing a distinction between categorical attributes (for which distinct values have no inherent similarity) and numeric attributes (for which the inherent similarity between any two values depends on their difference).

## Getting Started
### Installation
1. clone this repository
2. install dependencies (run from the root directory of this project):
  - If you would like to run [`test.ipynb`](test.ipynb): ``` pip install ".[test]" ```
  - If you just want to install the DART package: ``` pip install "." ```

### Examples
A full implementation example can be found in the [test notebook](https://github.com/DIDSR/DART/blob/main/test.ipynb).

## References

### Tool Reference

**RST Reference Number:** TBD

**Date of Publication:** TBD

**Recommended Citation:** TBD

<!-- Keep the Disclaimer commented out (follow this line's formatting!) until the RST is officially released -->
<!--
> **Disclaimer**
> 
> The enclosed tool is part of the [Catalog of Regulatory Science Tools](https://cdrh-rst.fda.gov/), which provides a peer-reviewed resource for stakeholders to use where standards and qualified Medical Device Development Tools (MDDTs) do not yet exist. These tools do not replace FDA-recognized standards or MDDTs. This catalog collates a variety of regulatory science tools that the FDA's Center for Devices and Radiological Health's (CDRH) Office of Science and Engineering Labs (OSEL) developed. These tools use the most innovative science to support medical device development and patient access to safe and effective medical devices. If you are considering using a tool from this catalog in your marketing submissions, note that these tools have not been qualified as [Medical Device Development Tools](https://www.fda.gov/medical-devices/medical-device-development-tools-mddt) and the FDA has not evaluated the suitability of these tools within any specific context of use. You may [request feedback or meetings for medical device submissions](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/requests-feedback-and-meetings-medical-device-submissions-q-submission-program) as part of the Q-Submission Program.
>
> For more information about the Catalog of Regulatory Science Tools, email [RST_CDRH@fda.hhs.gov](mailto:RST_CDRH@fda.hhs.gov).
-->

