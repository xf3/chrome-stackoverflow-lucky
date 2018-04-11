(function () {
    var inputElement,
        showItemTO,
        currentSearchQuery,
        resultItems, currentItem;

    /**
     * querySelectorAll() wrapper for element
     *
     * @param {Element} element Element to return wrapper for
     *
     * @return {Function} Function to be used with CSS selector (E.g. `q(element)('div > p')`)
     */
    function q(element) {
        return function (query) {
            return element.querySelectorAll(query);
        };
    }

    /**
     * document.getElementById() alias
     *
     * @param {String} id Element Id
     *
     * @return {HTMLElement}
     */
    function bid(id) {
        return document.getElementById(id);
    }

    /**
     * Returns body content from HTML string of whole page
     *
     * @param {String} html HTML content
     *
     * @return {HTMLDivElement}
     */
    function getHtmlBody(html) {
        var bodyStart, fakeElement;

        bodyStart = '<div id="body-tag-element"';

        html = html
            .replace('<body', bodyStart);

        fakeElement = document.createElement('div');

        fakeElement.innerHTML = html.substring(html.indexOf(bodyStart), html.indexOf('</body>')) + '</div>';

        return fakeElement;
    }

    /**
     * Parses question/answer element from results page
     *
     * @param {Element} questionElement Item element
     *
     * @return {{name: String, url: String, votes: Number, content: String}}
     */
    function parseItemInList(questionElement) {
        var $, linkElement, answered;

        $ = q(questionElement);

        linkElement = $('.result-link a')[0];

        answered = linkElement.innerHTML.substr(0, 3) === 'A: ';

        if (!answered) {
            answered = $('.stats .status').length === 1;
        }

        //TODO: item date

        return {
            name: linkElement.title,
            url: 'https://stackoverflow.com' + linkElement.getAttribute('href'),
            answered: answered,
            votes: Number($('.vote-count-post')[0].innerText) || 0,
            content: null,
        };
    }

    /**
     * Sets item answer content
     *
     * @param {Object} item Item
     *
     * @return {Promise}
     */
    function setItemContent(item) {
        if (item.content !== null) {
            return Promise.resolve(item);
        } else {
            return fetch(item.url)
                .then(function (result) {
                    return result.text();
                })
                .then(function (html) {
                    var answerElement;

                    //TODO: answer date
                    //TODO: sort answers by votes?
                    answerElement = q(getHtmlBody(html))('#answers .answer').item(0);

                    if (answerElement) {
                        item.content = q(answerElement)('.answercell .post-text').item(0).innerHTML;
                    }
                });
        }
    }

    /**
     * Displays question/answer item in popup
     *
     * @param {Number} index Item index
     * @param {Boolean} [debounce] Load item content with delay (E.g. when switching between search results while clicking nav buttons)
     */
    function showItem(index, debounce) {
        currentItem = index;

        bid('result-nav-current').innerHTML = index + 1;

        if (showItemTO) {
            clearTimeout(showItemTO);
        }

        showItemTO = setTimeout(function () {
            showItemTO = null;

            setItemContent(resultItems[index])
                .then(function () {
                    setResult(resultItems[index]);
                });
        }, debounce ? 500 : 0);
    }

    /**
     * Sets error message (Or hides it if empty value provided)
     *
     * @param {String} [errorMessage] Error message
     */
    function setError(errorMessage) {
        var errorElement;

        errorElement = bid('error-message');

        errorElement.style.display = errorMessage ? '' : 'none';

        errorElement.innerHTML = errorMessage || '';
    }

    /**
     * Sets HTML for given item in popup
     *
     * @param {{name: String, url: String, votes: Number, content: String}} [item] Item object
     */
    function setResult(item) {
        item = item || {};

        bid('result-name').innerHTML = item.name || '';
        bid('result-content').innerHTML = item.content || '';

        bid('result').style.display = item.name ? '' : 'none';

        bid('result-link').setAttribute('href', item.url || '');

        // Chrome's extension popup maximum height is 600px. If content is bigger - scrollbar will appear
        document.documentElement.classList.toggle('has-scrollbar', document.documentElement.scrollHeight > 600);
    }

    /**
     * Query input change handler. Performs search
     *
     * @param {Event} [event] Change event
     */
    function inputChaneHandler(event) {
        var query, searchUrl;

        if (!event || event.keyCode === 13) {
            query = inputElement.value;

            if (event) {
                event.preventDefault();
            }

            if (query.length > 5 && query !== currentSearchQuery) {
                currentSearchQuery = query;

                resultItems = [];

                //TODO: remember queries, show suggestions
                //TODO: show loading

                searchUrl = 'https://stackoverflow.com/search?q=' + encodeURIComponent(query);

                setError();

                fetch(searchUrl)
                    .then(function (response) {
                        if (response.url !== searchUrl) {
                            return Promise.reject('Too common search query, try to type in more specific one');
                        } else {
                            return response.text()
                                .then(function (html) {
                                    var results;

                                    results = [];

                                    q(getHtmlBody(html))('.search-results .search-result').forEach(function (resultElement) {
                                        results.push(parseItemInList(resultElement));
                                    });

                                    return results;
                                });
                        }
                    })
                    .then(function (results) {
                        if (!results.length) {
                            return Promise.reject('Nothing found');
                        }

                        resultItems = results;

                        bid('result-nav-count').innerHTML = resultItems.length;

                        if (resultItems.length) {
                            showItem(0);
                        }
                    })
                    .catch(function (errorMessage) {
                        setError(errorMessage);

                        resultItems = [];

                        setResult();

                        currentSearchQuery = null;
                    });
            }
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        setResult();

        inputElement = bid('search-input');

        inputElement.focus();

        inputElement.addEventListener('keydown', inputChaneHandler);

        inputElement.addEventListener('input', function (event) {
            if (!event.inputType) {
                // Built-in autocomplete suggestion selected
                inputChaneHandler();
            }
        });

        bid('result-nav-prev').addEventListener('click', function () {
            if (currentItem !== 0) {
                showItem(--currentItem, true);
            }
        });

        bid('result-nav-next').addEventListener('click', function () {
            if (currentItem !== resultItems.length - 1) {
                showItem(++currentItem, true);
            }
        });
    });
})();
