Feature: Placeholder screen

  As a developer verifying the frontend scaffold
  I want the app to show a placeholder screen
  So that I know the frontend side of the project is wired up

  Scenario: Player sees the placeholder screen
    Given the app is running
    When the player opens the app
    Then they see a placeholder screen with a heading
