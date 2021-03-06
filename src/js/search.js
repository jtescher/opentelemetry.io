summaryInclude = 60;
let fuseOptions = {
  shouldSort: true,
  includeMatches: true,
  threshold: 0.1,
  tokenize: true,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: [
    { name: "title", weight: 0.8 },
    { name: "description", weight: 0.5 },
    { name: "tags", weight: 0.3 },
    { name: "categories", weight: 0.3 },
  ],
};

// Get searchQuery for queryParams
let urlParams = new URLSearchParams(window.location.search);
let searchQuery = urlParams.get("s");

// Run search or display default body
if (searchQuery) {
  document.querySelector("#search-query").value = searchQuery;
  document.querySelector("#default-body").style.display = "none";
  executeSearch(searchQuery);
} else {
  let defaultBody = document.querySelector("#default-body");
  if (defaultBody.style.display === "none") {
    defaultBody.style.display = "block";
  }
}

// Runs search through Fuse for fuzzy search
function executeSearch(searchQuery) {
  fetch("/registry/index.json")
    .then((res) => res.json())
    .then((json) => {
      let fuse = new Fuse(json, fuseOptions);
      let results = fuse.search(searchQuery);

      if (results.length > 0) {
        populateResults(results);
      } else {
        document.querySelector("#search-results").innerHTML +=
          "<p>No matches found</p>";
      }
    });
}

// Populate the search results and render to the page
function populateResults(results) {
  results.forEach((result, key) => {
    let contents = result.item.description;
    let snippet = "";
    let snippetHighlights = [];

    if (fuseOptions.tokenize) {
      snippetHighlights.push(searchQuery);
    } else {
      result.matches.forEach((match) => {
        if (match.key === "tags" || match.key === "categories") {
          snippetHighlights.push(match.value);
        } else if (match.key === "description") {
          start =
            match.indices[0][0] - summaryInclude > 0
              ? match.indices[0][0] - summaryInclude
              : 0;
          end =
            match.indices[0][1] + summaryInclude < contents.length
              ? match.indices[0][1] + summaryInclude
              : contents.length;
          snippet += contents.substring(start, end);
          snippetHighlights.push(
            match.value.substring(
              match.indices[0][0],
              match.indices[0][1] - mvalue.indices[0][0] + 1
            )
          );
        }
      });
    }

    if (snippet.length < 1 && contents.length > 0) {
      snippet += contents.substring(0, summaryInclude * 2);
    }

    // Pull template from hugo template definition
    let templateDefinition = document.querySelector("#search-result-template")
      .innerHTML;

    // Replace values from template with search results
    let output = render(templateDefinition, {
      key: key,
      title: result.item.title,
      link: result.item.permalink,
      tags: result.item.tags,
      categories: result.item.categories,
      description: result.item.description,
      repo: result.item.repo,
      registryType: result.item.registryType,
      language: result.item.language,
      snippet: snippet,
      otVersion: result.item.otVersion,
    });
    document.querySelector("#search-results").innerHTML += output;
  });
}

// Helper function to generate HTML for a search result
function render(templateString, data) {
  let conditionalMatches, conditionalPattern, copy;
  conditionalPattern = /\$\{\s*isset ([a-zA-Z]*) \s*\}(.*)\$\{\s*end\s*}/g;
  //since loop below depends on re.lastInxdex, we use a copy to capture any manipulations whilst inside the loop
  copy = templateString;
  while (
    (conditionalMatches = conditionalPattern.exec(templateString)) !== null
  ) {
    if (data[conditionalMatches[1]]) {
      //valid key, remove conditionals, leave contents.
      copy = copy.replace(conditionalMatches[0], conditionalMatches[2]);
    } else {
      //not valid, remove entire section
      copy = copy.replace(conditionalMatches[0], "");
    }
  }
  templateString = copy;

  //now any conditionals removed we can do simple substitution
  let key, find, re;
  for (key in data) {
    find = "\\$\\{\\s*" + key + "\\s*\\}";
    re = new RegExp(find, "g");
    templateString = templateString.replace(re, data[key]);
  }
  return templateString;
}

// listeners, etc
let selectedLanguage = "all";
let selectedComponent = "all";

document.addEventListener("input", function (event) {
  if (event.target.id === "componentFilter") {
    selectedComponent = event.target.value;
  }
  if (event.target.id === "languageFilter") {
    selectedLanguage = event.target.value;
  }
  updateFilters();
});

// Filters items based on language and component filters
function updateFilters() {
  let allItems = [...document.getElementsByClassName("component")];
  if (selectedComponent === "all" && selectedLanguage === "all") {
    allItems.forEach((element) => element.classList.remove("is-hidden"));
  } else {
    allItems.forEach((element) => {
      const dc = element.dataset.registrytype;
      const dl = element.dataset.registrylanguage;
      if (
        (dc === selectedComponent || selectedComponent === "all") &&
        (dl === selectedLanguage || selectedLanguage === "all")
      ) {
        element.classList.remove("is-hidden");
      } else if (dc === selectedComponent && dl !== selectedLanguage) {
        element.classList.add("is-hidden");
      } else if (dl === selectedLanguage && dc !== selectedComponent) {
        element.classList.add("is-hidden");
      } else {
        element.classList.add("is-hidden");
      }
    });
  }
}
