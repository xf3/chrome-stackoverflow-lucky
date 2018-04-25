import Preact, {h, Component} from 'preact';
import style from '../../sass/search-popup.scss';

class PopupSearch extends Component {
    /**
     * @inheritDoc
     */
    constructor(props) {
        super(props);

        this.state = {
            result: {
                name: '',
                content: '',
                url: '',
                count: '',
                current: ''
            },
            query: '',
            errorMessage: ''
        };

        this.currentItem = null;

        this.showItemTO = null;

        this.resultItems = [];

        this.setResult();
    }

    /**
     * querySelectorAll() wrapper for element
     *
     * @param {Element} element Element to return wrapper for
     *
     * @return {Function} Function to be used with CSS selector (E.g. `q(element)('div > p')`)
     */
    static q(element) {
        return function (query) {
            return element.querySelectorAll(query);
        };
    }

    /**
     * Returns body content from HTML string of whole page
     *
     * @param {String} html HTML content
     *
     * @return {HTMLDivElement}
     */
    static getHtmlBody(html) {
        const bodyStart = '<div id="body-tag-element"';

        html = html
            .replace('<body', bodyStart);

        const fakeElement = document.createElement('div');

        fakeElement.innerHTML = html.substring(html.indexOf(bodyStart), html.indexOf('</body>')) + '</div>';

        return fakeElement;
    }

    /**
     * Parses question/answer element from results page
     *
     * @param {Element} questionElement Item element
     *
     * @return {{name: String, url: String, votes: Number, content: String, date: Date}}
     */
    static parseItemInList(questionElement) {
        const $ = PopupSearch.q(questionElement);

        const linkElement = $('.result-link a')[0];

        let answered = linkElement.innerHTML.trim().substr(0, 3) === 'A: ';

        if (!answered) {
            const answeredBadges = $('.stats .status');

            answered = answeredBadges.length === 1 && !answeredBadges[0].classList.contains('unanswered');
        }

        return {
            name: linkElement.title,
            url: 'https://stackoverflow.com' + linkElement.getAttribute('href'),
            date: new Date($('.relativetime')[0].title),
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
    setItemContent(item) {
        if (item.content !== null) {
            return Promise.resolve(item);
        } else {
            return fetch(item.url)
                .then(result =>
                    result.text()
                )
                .then(html => {
                    //TODO: sort answers by votes?
                    const answerElement = PopupSearch.q(PopupSearch.getHtmlBody(html))('#answers .answer').item(0);

                    if (answerElement) {
                        item.content = PopupSearch.q(answerElement)('.answercell .post-text').item(0).innerHTML;
                    }

                    return item;
                });
        }
    }

    /**
     * Displays question/answer item in popup
     *
     * @param {Number} index Item index
     * @param {Boolean} [debounce] Load item content with delay (E.g. when switching between search results while clicking nav buttons)
     */
    showItem(index, debounce) {
        this.currentItem = index;

        this.setState({
            result: {
                current: index + 1,
            }
        });

        if (this.showItemTO) {
            clearTimeout(this.showItemTO);
        }

        this.showItemTO = setTimeout(() => {
            this.showItemTO = null;

            this.setItemContent(this.resultItems[index])
                .then(() => {
                    this.setResult(this.resultItems[index]);
                });
        }, debounce ? 500 : 0);
    }

    /**
     * Shows previous search result
     */
    showPrevious() {
        if (this.currentItem !== 0) {
            this.showItem(--this.currentItem, true);
        }
    }

    /**
     * Shows net search result
     */
    showNext() {
        if (this.currentItem !== this.resultItems.length - 1) {
            this.showItem(++this.currentItem, true);
        }
    }

    /**
     * Sets HTML for given item in popup
     *
     * @param {{name: String, url: String, votes: Number, content: String, date: Date}} [item] Item object
     */
    setResult(item) {
        item = item || {};

        this.setState({
            result: {
                name: item.name || '',
                date: item.date ? item.date.toISOString().substr(0, 19).replace('T', ' ') : '',
                content: item.content || '',
                url: item.url || '',
            }
        }, () => {
            // Chrome's extension popup maximum height is 600px. If content is bigger - scrollbar will appear
            document.documentElement.classList.toggle('has-scrollbar', document.documentElement.scrollHeight > 600);
        });
    }

    /**
     * Recursively merges objects
     *
     * @param {Object} destination Destination object
     * @param {Object} source Source object
     *
     * @returns {Object}
     */
    mergeObjects(destination, source) {
        let result = Object.assign({}, destination);

        for (let key in source) {
            if (source.hasOwnProperty(key)) {
                if (result[key] && typeof source[key] === 'object') {
                    result[key] = this.mergeObjects(result[key], source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }

        return result;
    }

    /**
     * Sets new state by merging with new partial data
     *
     * @inheritDoc
     */
    setState(newState, callback) {
        super.setState(this.mergeObjects(this.state, newState), callback);
    }

    /**
     * Sets error message (Or hides it if empty value provided)
     *
     * @para m {String} [errorMessage] Error message
     */
    setError(errorMessage) {
        this.setState({
            errorMessage: errorMessage || ''
        });
    }

    /**
     * Query input change handler. Performs search
     *
     * @param {Event} [event] Change event
     */
    onInputKeyDown(event) {
        if (event.keyCode === 13) {
            event.preventDefault();

            this.trySearch(event.target.value);
        }
    }

    /**
     * "input" event listener
     *
     * @param event
     */
    onInput(event) {
        if (!event.inputType) {
            // Built-in autocomplete suggestion selected
            this.trySearch(event.target.value);
        }
    }

    /**
     * Performs search if query is valid
     *
     * @param {String} query Search query
     */
    trySearch(query) {
        this.setState({
            query: query,
        });

        if (query.length > 5 && query !== this.currentSearchQuery) {
            this.currentSearchQuery = query;

            this.resultItems = [];

            //TODO: remember queries, show suggestions
            //TODO: show loading

            const searchUrl = 'https://stackoverflow.com/search?q=' + encodeURIComponent(query);

            this.setError();

            fetch(searchUrl)
                .then(response => {
                    if (response.url !== searchUrl) {
                        return Promise.reject('Too common search query, try to type in more specific one');
                    } else {
                        return response.text()
                            .then(html => {
                                let results = [];

                                PopupSearch.q(PopupSearch.getHtmlBody(html))('.search-results .search-result').forEach(resultElement => {
                                    const item = PopupSearch.parseItemInList(resultElement);

                                    if (item.answered) {
                                        results.push(item);
                                    }
                                });

                                return results;
                            });
                    }
                })
                .then(results => {
                    if (!results.length) {
                        return Promise.reject('Nothing found');
                    }

                    this.resultItems = results;

                    this.setState({
                        result: {
                            count: this.resultItems.length,
                        }
                    });

                    if (this.resultItems.length) {
                        this.showItem(0);
                    }
                })
                .catch(errorMessage => {
                    this.setError(errorMessage);

                    this.resultItems = [];

                    this.setResult();

                    this.currentSearchQuery = null;
                });
        }
    }

    /**
     * @inheritDoc
     */
    render(props, state, content) {
        return (
            <div>
                <form>
                    <input
                        type="text"
                        name="search-query"
                        id="search-input"
                        size="30"
                        autofocus
                        value={state.query}
                        placeholder="Type in question and hit enter" onKeyDown={this.onInputKeyDown.bind(this)}
                        onInput={this.onInput.bind(this)}
                    />
                </form>

                {
                    state.result.name &&
                    <div id="result">
                        <div id="result-nav">
                            <button onClick={this.showPrevious.bind(this)}>&lt;</button>

                            {state.result.current}
                            /
                            {state.result.count}

                            <button onClick={this.showNext.bind(this)}>&gt;</button>
                        </div>

                        <h3 id="result-name">{state.result.name}</h3>

                        <div id="result-date">{state.result.date}</div>

                        <a id="result-link" href={state.result.url} target="_blank">[ Answer link ]</a>

                        {/*TODO code highlighting*/}
                        <div id="result-content" dangerouslySetInnerHTML={{__html: state.result.content}} />
                    </div>
                }

                {state.errorMessage && <div id="error-message">{state.errorMessage}</div>}
            </div>
        );
    }
}

export default PopupSearch;
