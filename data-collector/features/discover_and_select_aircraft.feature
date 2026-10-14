Feature: Discover and select aircraft from Wikipedia's list-of-aircraft index

  As someone curating targets.txt
  I want to build a searchable index from Wikipedia's editorially-maintained
  "List of aircraft" pages and select from it
  So that I don't have to guess exact Wikipedia article titles by hand

  Scenario: Building the index parses manufacturer sections into searchable entries
    Given the "List of aircraft (A)" index page is available
    When the aircraft index is built
    Then searching the index for "A320neo" returns "Airbus A320neo"

  Scenario: Searching returns matches by manufacturer as well as title
    Given the aircraft index has been built from "List of aircraft (A)"
    When searching the index for "Airbus"
    Then the results include "Airbus A320neo"
    And the results include "Airbus A350"

  Scenario: Confirming a selection appends new titles without duplicating existing ones
    Given targets.txt already contains "Cessna 172"
    When the selection "Cessna 172" and "Boeing 747-8" is confirmed
    Then targets.txt contains "Boeing 747-8" exactly once
    And targets.txt contains "Cessna 172" exactly once

  Scenario: Running the pipeline after confirming a selection produces a cleaned aircraft record
    Given the selection "Cessna 172" has been confirmed into targets.txt
    And the Wikipedia page "Cessna 172" is fetchable with a parseable aircraft infobox
    When the pipeline is run against the updated targets
    Then a cleaned_aircraft row exists for "Cessna 172"
