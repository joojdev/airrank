Feature: Filter raw pages by whether they're even about an aircraft

  As the data collector's filter stage
  I want to exclude pages that don't have an aircraft infobox at all
  So that stage 3 doesn't spend an LLM call on something obviously unrelated

  Scenario: A well-formed single-aircraft page is included
    Given a raw_pages row for "Cessna 172" loaded from its fixture
    When stage 2 classifies all raw pages
    Then the filtered_pages row for "Cessna 172" has include true

  Scenario: A family-overview page is still included -- that judgment is now the LLM's
    Given a raw_pages row for "Airbus A320 family" loaded from its fixture
    When stage 2 classifies all raw pages
    Then the filtered_pages row for "Airbus A320 family" has include true

  Scenario: A page with no aircraft infobox at all is excluded
    Given a raw_pages row for "Not An Aircraft" with wikitext:
      """
      Some article that is not about an aircraft and has no relevant infobox.
      """
    When stage 2 classifies all raw pages
    Then the filtered_pages row for "Not An Aircraft" has include false
    And its reason mentions "infobox"
