# Discovery Categories

The Discover page at `/discover` includes a **Browse by category** rail beneath
the search controls. It lists all 21 categories from the shared `QuizCategory`
enum, including categories with no public quizzes. Display names use the existing
frontend category labels.

Selecting a category opens a dedicated page such as `/discover/category/SCIENCE`.
The page has its own category heading, search and filter controls, responsive
quiz-card grid, and pagination. The category rail stays on the main Discover
page, with the same visible scrollbar and desktop arrows as the other rails.
Keyboard focus keeps category links visible in the horizontal rail.

Search, language, game mode, and sort controls can refine a category. The path
identifies the category and the query string stores refinements, so refresh,
shared links, and browser Back restore the selection. **Clear filters** clears
refinements while retaining the category. Selecting another category in the
filter modal changes the route and resets pagination; selecting all categories
returns to Discover search. Unknown category routes show a category-not-found
state without fetching quizzes. Unknown query values are ignored.
**Back to discovery** links to the main Discover page and its curated rails.
Selecting a category in Discover's filter modal also opens its dedicated page.
Older `/discover?category=…` links redirect to the dedicated route while keeping
the other refinements.

Category results use the existing `GET /quizzes` endpoint with its `category`
filter and offset pagination. They include matching public quizzes whose authors
still exist, rather than the bounded curated discovery snapshot. The API resolves
authors before counting and paginating, so quizzes with deleted authors cannot
break subsequent pages or inflate the available total. A quiz ID tie-breaker
keeps ordering stable when sort values are equal. No new endpoint is required.
Empty categories display an empty state. Failed initial requests provide a retry
action; a failed subsequent page preserves the grid and offers a retry of that
page without reloading previously fetched pages.

The grid uses the existing responsive infinite-offset query hook, with pages of
20 quizzes on desktop, 15 on tablet, and 10 on mobile. **Load more** remains
available until the accumulated results reach the API's total.
