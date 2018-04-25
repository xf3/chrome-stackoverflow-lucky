import {h, render} from 'preact';
import PopupSearch from '../components/popup-search';

document.addEventListener('DOMContentLoaded', function () {
    render(<PopupSearch/>, document.body);
});
