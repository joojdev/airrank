Feature: Write placeholder airplane data

  As a developer verifying the crawler scaffold
  I want the crawler to write a placeholder record to the shared data file
  So that I know the crawler side of the project is wired up

  Scenario: Crawler writes placeholder airplane data
    Given the shared data file does not exist yet
    When the crawler is run
    Then a JSON file exists at "frontend/public/data/airplanes.json"
    And it contains exactly one placeholder aircraft record
