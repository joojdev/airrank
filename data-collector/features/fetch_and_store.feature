Feature: Fetch and store raw Wikipedia aircraft pages

  As the data collector's fetch stage
  I want to fetch wikitext and categories for a target aircraft page and store them verbatim
  So that later pipeline stages can work from a local cache without re-hitting Wikipedia

  Scenario: Fetch a page that is a redirect and store the resolved content
    Given the Wikipedia title "F-16 Fighting Falcon" redirects to "General Dynamics F-16 Fighting Falcon"
    When stage 1 fetches "F-16 Fighting Falcon"
    Then a row exists in raw_pages with resolved_title "General Dynamics F-16 Fighting Falcon"
    And its wikitext contains "Infobox aircraft"
    And its categories include "Category:Lockheed Martin aircraft"

  Scenario: Re-fetching an already-stored title does not hit the network again
    Given "Cessna 172" has already been fetched and stored in raw_pages
    When stage 1 fetches "Cessna 172" again without forcing a refresh
    Then no new HTTP request is made

  Scenario: A page with an infobox image gets its image saved as base64 and as a real file
    Given the Wikipedia title "Cessna 172" has a fetchable infobox image
    When stage 1 fetches "Cessna 172"
    Then its image is stored as a base64 data URI
    And a real image file was saved for "Cessna 172"

  Scenario: A page with no infobox image still fetches successfully
    Given the Wikipedia title "Cessna 172" has no infobox image
    When stage 1 fetches "Cessna 172"
    Then a row exists in raw_pages with resolved_title "Cessna 172"
    And no image file was saved for "Cessna 172"
