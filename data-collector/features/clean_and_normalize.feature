Feature: Clean and normalize included pages into aircraft records

  As the data collector's clean stage
  I want to wire the LLM extractor's output into cleaned_aircraft correctly
  So that cleaned_aircraft holds exactly what the model reported, review-flagged when uncertain

  Scenario: A well-formed extraction is normalized end to end
    Given an included raw_pages row for "Cessna 172" loaded from its fixture
    And its fetched image_path is "images/cessna-172.jpg"
    And the LLM extracts:
      | field             | value        |
      | name              | Cessna 172   |
      | manufacturer      | Cessna       |
      | engine_count      | 1            |
      | wing_position     | Alta         |
      | landing_gear_type | Triciclo     |
      | speed_regime      | subsonic     |
    When stage 3 cleans all included pages
    Then the cleaned_aircraft row for "Cessna 172" has manufacturer "Cessna"
    And the cleaned_aircraft row for "Cessna 172" has engine_count 1
    And the cleaned_aircraft row for "Cessna 172" has wing_position "Alta"
    And the cleaned_aircraft row for "Cessna 172" has landing_gear_type "Triciclo"
    And the cleaned_aircraft row for "Cessna 172" has speed_regime "subsonic"
    And the cleaned_aircraft row for "Cessna 172" has needs_review false
    And the cleaned_aircraft row for "Cessna 172" has image_path "images/cessna-172.jpg"

  Scenario: A field the LLM flags as uncertain is stored with needs_review and a reason
    Given an included raw_pages row for "Test Aircraft" with wikitext:
      """
      {{Infobox aircraft
      | name = Test Aircraft
      }}
      """
    And the LLM extracts:
      | field             | value                                          |
      | name              | Test Aircraft                                  |
      | service_ceiling_m | 4100                                           |
      | uncertain_fields  | service_ceiling_m                              |
      | notes             | ceiling value looked implausible for the units |
    When stage 3 cleans all included pages
    Then the cleaned_aircraft row for "Test Aircraft" has service_ceiling_m approximately 4100
    And the cleaned_aircraft row for "Test Aircraft" has needs_review true
    And its review reasons mention "ceiling"

  Scenario: A supersonic aircraft's speed is stored as a raw Mach number, never converted
    Given an included raw_pages row for "F-16" loaded from its fixture
    And the LLM extracts:
      | field        | value        |
      | name         | F-16         |
      | speed_regime | supersonic   |
      | max_speed    | 2.0          |
    When stage 3 cleans all included pages
    Then the cleaned_aircraft row for "F-16" has speed_regime "supersonic"
    And the cleaned_aircraft row for "F-16" has max_speed 2.0

  Scenario: A page the LLM says isn't a single well-specified aircraft is still kept, flagged for review
    Given an included raw_pages row for "Airbus A320 family" loaded from its fixture
    And the LLM reports this is not a single aircraft
    When stage 3 cleans all included pages
    Then a cleaned_aircraft row exists for "Airbus A320 family"
    And the cleaned_aircraft row for "Airbus A320 family" has needs_review true
    And its review reasons mention "well-specified aircraft"
