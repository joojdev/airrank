Feature: Export cleaned aircraft records to the committed data file

  As the data collector's export step
  I want to write cleaned, non-blocking aircraft records to airplanes.json
  So that the frontend has a static, committed data source matching the documented schema

  Scenario: Export writes only non-blocking cleaned records
    Given a cleaned_aircraft row for "Good Plane" with needs_review false
    And a cleaned_aircraft row for "Flagged Plane" with needs_review true
    When the export step runs
    Then the exported file contains a record with id "good-plane"
    And the exported file does not contain a record for "Flagged Plane"
    And every exported record's "type" field is a JSON array
