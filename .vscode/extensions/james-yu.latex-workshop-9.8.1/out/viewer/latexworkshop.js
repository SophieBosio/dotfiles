var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _LateXWorkshopPdfViewer_restoredState;
import { createConnectionPort } from './components/connection.js';
import { editHTML } from './components/htmleditor.js';
import { SyncTex } from './components/synctex.js';
import { PageTrimmer, registerPageTrimmer } from './components/pagetrimmer.js';
import * as utils from './components/utils.js';
import { ExternalPromise } from './components/externalpromise.js';
import { ViewerHistory } from './components/viewerhistory.js';
class LateXWorkshopPdfViewer {
    constructor() {
        this.documentTitle = '';
        this.embedded = window.parent !== window;
        // The 'webviewerloaded' event is fired just before the initialization of PDF.js.
        // We can set PDFViewerApplicationOptions at the time.
        // - https://github.com/mozilla/pdf.js/wiki/Third-party-viewer-usage#initialization-promise
        // - https://github.com/mozilla/pdf.js/pull/10318
        this.webViewerLoaded = new Promise((resolve) => {
            document.addEventListener('webviewerloaded', () => resolve());
        });
        this.synctexEnabled = true;
        this.autoReloadEnabled = true;
        this.setupAppOptionsPromise = new ExternalPromise();
        _LateXWorkshopPdfViewer_restoredState.set(this, new ExternalPromise());
        // When the promise is resolved, the initialization
        // of LateXWorkshopPdfViewer and PDF.js is completed.
        this.pdfViewerStarted = new Promise((resolve) => {
            this.onDidStartPdfViewer(() => resolve());
        });
        const pack = this.decodeQuery();
        this.encodedPdfFilePath = pack.encodedPdfFilePath;
        this.documentTitle = pack.documentTitle || '';
        document.title = this.documentTitle;
        this.pdfFileUri = pack.pdfFileUri;
        editHTML();
        this.viewerHistory = new ViewerHistory(this);
        this.connectionPort = createConnectionPort(this);
        this.synctex = new SyncTex(this);
        this.pageTrimmer = new PageTrimmer(this);
        this.setupConnectionPort();
        this.onDidStartPdfViewer(() => {
            return this.applyParamsOnStart();
        });
        this.onPagesLoaded(() => {
            this.send({ type: 'loaded', pdfFileUri: this.pdfFileUri });
        }, { once: true });
        this.hidePrintButton();
        this.registerKeybinding();
        this.registerSynctexCheckBox();
        this.registerAutoReloadCheckBox();
        this.startRebroadcastingKeyboardEvent();
        this.startSendingState();
        void this.startReceivingPanelManagerResponse();
        registerPageTrimmer();
        this.pdfPagesLoaded = new Promise((resolve) => {
            this.onPagesLoaded(() => resolve(), { once: true });
        });
        this.onPagesInit(() => {
            this.pdfPagesLoaded = new Promise((resolve) => {
                this.onPagesLoaded(() => resolve(), { once: true });
            });
        });
        this.onViewUpdated(() => this.repositionDOM());
        void this.setupAppOptions();
    }
    // For the details of the initialization of PDF.js,
    // see https://github.com/mozilla/pdf.js/wiki/Third-party-viewer-usage
    // We should use only the promises provided by PDF.js here, not the ones defined by us,
    // to avoid deadlock.
    async getEventBus() {
        await this.webViewerLoaded;
        await PDFViewerApplication.initializedPromise;
        return PDFViewerApplication.eventBus;
    }
    repositionDOM() {
        for (const anno of document.getElementsByClassName('textAnnotation')) {
            if (parseFloat(anno.style.left) <= 50) {
                continue;
            }
            for (const popupWrapper of anno.getElementsByClassName('popupWrapper')) {
                popupWrapper.style.right = '100%';
                popupWrapper.style.left = '';
            }
            for (const popup of anno.getElementsByClassName('popup')) {
                popup.style.right = '0px';
            }
        }
    }
    onDidStartPdfViewer(cb) {
        const documentLoadedEvent = 'documentloaded';
        const cb0 = () => {
            cb();
            PDFViewerApplication.eventBus.off(documentLoadedEvent, cb0);
        };
        void this.getEventBus().then(eventBus => {
            eventBus.on(documentLoadedEvent, cb0);
        });
        return { dispose: () => PDFViewerApplication.eventBus.off(documentLoadedEvent, cb0) };
    }
    onPagesInit(cb, option) {
        const pagesInitEvent = 'pagesinit';
        const cb0 = () => {
            cb();
            if (option?.once) {
                PDFViewerApplication.eventBus.off(pagesInitEvent, cb0);
            }
        };
        void this.getEventBus().then(eventBus => {
            eventBus.on(pagesInitEvent, cb0);
        });
        return { dispose: () => PDFViewerApplication.eventBus.off(pagesInitEvent, cb0) };
    }
    onPagesLoaded(cb, option) {
        const pagesLoadedEvent = 'pagesloaded';
        const cb0 = () => {
            cb();
            if (option?.once) {
                PDFViewerApplication.eventBus.off(pagesLoadedEvent, cb0);
            }
        };
        void this.getEventBus().then(eventBus => {
            eventBus.on(pagesLoadedEvent, cb0);
        });
        return { dispose: () => PDFViewerApplication.eventBus.off(pagesLoadedEvent, cb0) };
    }
    onViewUpdated(cb, option) {
        const viewUpdatedEvent = 'updateviewarea';
        const cb0 = () => {
            cb();
            if (option?.once) {
                PDFViewerApplication.eventBus.off(viewUpdatedEvent, cb0);
            }
        };
        void this.getEventBus().then(eventBus => {
            eventBus.on(viewUpdatedEvent, cb0);
        });
        return { dispose: () => PDFViewerApplication.eventBus.off(viewUpdatedEvent, cb0) };
    }
    send(message) {
        void this.connectionPort.send(message);
    }
    addLogMessage(message) {
        this.send({ type: 'add_log', message });
    }
    getPdfViewerState() {
        const pack = {
            pdfFileUri: this.pdfFileUri,
            scale: PDFViewerApplication.pdfViewer.currentScaleValue,
            scrollMode: PDFViewerApplication.pdfViewer.scrollMode,
            sidebarView: PDFViewerApplication.pdfSidebar.visibleView,
            spreadMode: PDFViewerApplication.pdfViewer.spreadMode,
            scrollTop: document.getElementById('viewerContainer').scrollTop,
            scrollLeft: document.getElementById('viewerContainer').scrollLeft,
            trim: document.getElementById('trimSelect').selectedIndex,
            synctexEnabled: this.synctexEnabled,
            autoReloadEnabled: this.autoReloadEnabled
        };
        return pack;
    }
    async fetchParams() {
        const response = await fetch('config.json');
        const params = await response.json();
        return params;
    }
    get restoredState() {
        if (this.embedded) {
            return __classPrivateFieldGet(this, _LateXWorkshopPdfViewer_restoredState, "f").promise;
        }
        else {
            return;
        }
    }
    async waitSetupAppOptionsFinished() {
        return this.setupAppOptionsPromise.promise;
    }
    async setupAppOptions() {
        const workerPort = new Worker('build/pdf.worker.js');
        const params = await this.fetchParams();
        document.addEventListener('webviewerloaded', () => {
            const color = this.isPrefersColorSchemeDark(params.codeColorTheme) ? params.color.dark : params.color.light;
            const options = {
                annotationEditorMode: -1,
                disablePreferences: true,
                enableScripting: false,
                cMapUrl: '/cmaps/',
                sidebarViewOnLoad: 0,
                standardFontDataUrl: '/standard_fonts/',
                workerPort,
                workerSrc: 'build/pdf.worker.js',
                forcePageColors: true,
                ...color
            };
            PDFViewerApplicationOptions.setAll(options);
        });
        this.setupAppOptionsPromise.resolve();
    }
    async applyParamsOnStart() {
        const params = await this.fetchParams();
        this.applyNonStatefulParams(params);
        const restoredState = await this.restoredState;
        if (restoredState) {
            await this.restorePdfViewerState(restoredState);
        }
        else {
            await this.restorePdfViewerState(params);
        }
        this.setCssRule();
    }
    async restorePdfViewerState(state) {
        await this.pdfViewerStarted;
        // By setting the scale, scaling will be invoked if necessary.
        // The scale can be a non-number one.
        if (state.scale !== undefined) {
            PDFViewerApplication.pdfViewer.currentScaleValue = state.scale;
        }
        if (state.scrollMode !== undefined) {
            PDFViewerApplication.pdfViewer.scrollMode = state.scrollMode;
        }
        if (state.spreadMode !== undefined) {
            PDFViewerApplication.pdfViewer.spreadMode = state.spreadMode;
        }
        if (state.scrollTop !== undefined) {
            document.getElementById('viewerContainer').scrollTop = state.scrollTop;
        }
        if (state.scrollLeft !== undefined) {
            document.getElementById('viewerContainer').scrollLeft = state.scrollLeft;
        }
        if (state.sidebarView !== undefined) {
            PDFViewerApplication.pdfSidebar.switchView(state.sidebarView);
        }
        if (state.synctexEnabled !== undefined) {
            this.setSynctex(state.synctexEnabled);
        }
        if (state.autoReloadEnabled !== undefined) {
            this.setAutoReload(state.autoReloadEnabled);
        }
        if (state.trim !== undefined) {
            const trimSelect = document.getElementById('trimSelect');
            const ev = new Event('change');
            // We have to wait for currentScaleValue set above to be effected
            // especially for cases of non-number scales.
            // https://github.com/James-Yu/LaTeX-Workshop/issues/1870
            void this.pdfPagesLoaded.then(() => {
                if (state.trim === undefined) {
                    return;
                }
                trimSelect.selectedIndex = state.trim;
                trimSelect.dispatchEvent(ev);
                // By setting the scale, the callbacks of trimming pages are invoked.
                // However, given "auto" and other non-number scales, the scale will be
                // unnecessarily recalculated, which we must avoid.
                if (state.scale !== undefined && /\d/.exec(state.scale)) {
                    PDFViewerApplication.pdfViewer.currentScaleValue = state.scale;
                }
                if (state.scrollTop !== undefined) {
                    document.getElementById('viewerContainer').scrollTop = state.scrollTop;
                }
                if (state.sidebarView !== undefined) {
                    PDFViewerApplication.pdfSidebar.switchView(state.sidebarView);
                }
                this.sendCurrentStateToPanelManager();
            });
        }
        this.sendCurrentStateToPanelManager();
    }
    forwardSynctex(position) {
        if (!this.synctexEnabled) {
            this.addLogMessage('SyncTeX temporarily disabled.');
            return;
        }
        // use the offsetTop of the actual page, much more accurate than multiplying the offsetHeight of the first page
        // https://github.com/James-Yu/LaTeX-Workshop/pull/417
        const container = document.getElementById('viewerContainer');
        const pos = PDFViewerApplication.pdfViewer._pages[position.page - 1].viewport.convertToViewportPoint(position.x, position.y);
        const page = document.getElementsByClassName('page')[position.page - 1];
        const maxScrollX = window.innerWidth * 0.9;
        const minScrollX = window.innerWidth * 0.1;
        let scrollX = page.offsetLeft + pos[0];
        scrollX = Math.min(scrollX, maxScrollX);
        scrollX = Math.max(scrollX, minScrollX);
        const scrollY = page.offsetTop + page.offsetHeight - pos[1];
        // set positions before and after SyncTeX to viewerHistory
        this.viewerHistory.set(container.scrollTop);
        if (PDFViewerApplication.pdfViewer.scrollMode === 1) {
            // horizontal scrolling
            container.scrollLeft = page.offsetLeft;
        }
        else {
            // vertical scrolling
            container.scrollTop = scrollY - document.body.offsetHeight * 0.4;
        }
        this.viewerHistory.set(container.scrollTop);
        const indicator = document.getElementById('synctex-indicator');
        indicator.className = 'show';
        indicator.style.left = `${scrollX}px`;
        indicator.style.top = `${scrollY}px`;
        setTimeout(() => indicator.className = 'hide', 10);
        setTimeout(() => {
            indicator.style.left = '';
            indicator.style.top = '';
        }, 1000);
    }
    reload() {
        location.reload();
    }
    refreshPDFViewer() {
        if (!this.autoReloadEnabled) {
            this.addLogMessage('Auto reload temporarily disabled.');
            return;
        }
        const pack = {
            scale: PDFViewerApplication.pdfViewer.currentScaleValue,
            scrollMode: PDFViewerApplication.pdfViewer.scrollMode,
            sidebarView: PDFViewerApplication.pdfSidebar.visibleView,
            spreadMode: PDFViewerApplication.pdfViewer.spreadMode,
            scrollTop: document.getElementById('viewerContainer').scrollTop,
            scrollLeft: document.getElementById('viewerContainer').scrollLeft
        };
        // Note: without showPreviousViewOnLoad = false restoring the position after the refresh will fail if
        // the user has clicked on any link in the past (pdf.js will automatically navigate to that link).
        PDFViewerApplicationOptions.set('showPreviousViewOnLoad', false);
        // Override the spread mode specified in PDF documents with the current one.
        // https://github.com/James-Yu/LaTeX-Workshop/issues/1871
        PDFViewerApplicationOptions.set('spreadModeOnLoad', pack.spreadMode);
        void PDFViewerApplication.open(`${utils.pdfFilePrefix}${this.encodedPdfFilePath}`).then(() => {
            // reset the document title to the original value to avoid duplication
            document.title = this.documentTitle;
        });
        this.onPagesInit(() => {
            PDFViewerApplication.pdfSidebar.switchView(pack.sidebarView);
            PDFViewerApplication.pdfViewer.currentScaleValue = pack.scale;
            PDFViewerApplication.pdfViewer.scrollMode = pack.scrollMode;
            PDFViewerApplication.pdfViewer.spreadMode = pack.spreadMode;
            document.getElementById('viewerContainer').scrollTop = pack.scrollTop;
            document.getElementById('viewerContainer').scrollLeft = pack.scrollLeft;
        }, { once: true });
        // The height of each page can change after a `pagesinit` event.
        // We have to set scrollTop on a `pagesloaded` event for that case.
        this.onPagesLoaded(() => {
            document.getElementById('viewerContainer').scrollTop = pack.scrollTop;
            document.getElementById('viewerContainer').scrollLeft = pack.scrollLeft;
        }, { once: true });
        this.onPagesLoaded(() => {
            this.send({ type: 'loaded', pdfFileUri: this.pdfFileUri });
        }, { once: true });
    }
    isPrefersColorSchemeDark(codeColorTheme) {
        if (this.embedded) {
            return codeColorTheme === 'dark';
        }
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    applyNonStatefulParams(params) {
        if (params.hand) {
            PDFViewerApplication.pdfCursorTools.handTool.activate();
            document.querySelector('#cursorHandTool').classList.add('toggled');
            document.querySelector('#cursorHandTool').setAttribute('aria-checked', 'true');
            document.querySelector('#cursorSelectTool').classList.remove('toggled');
            document.querySelector('#cursorSelectTool').setAttribute('aria-checked', 'false');
        }
        else {
            PDFViewerApplication.pdfCursorTools.handTool.deactivate();
            document.querySelector('#cursorHandTool').classList.remove('toggled');
            document.querySelector('#cursorHandTool').setAttribute('aria-checked', 'false');
            document.querySelector('#cursorSelectTool').classList.add('toggled');
            document.querySelector('#cursorSelectTool').setAttribute('aria-checked', 'true');
        }
        if (params.invertMode.enabled) {
            const { brightness, grayscale, hueRotate, invert, sepia } = params.invertMode;
            const filter = `invert(${invert * 100}%) hue-rotate(${hueRotate}deg) grayscale(${grayscale}) sepia(${sepia}) brightness(${brightness})`;
            if (this.isPrefersColorSchemeDark(params.codeColorTheme)) {
                document.querySelector('#viewerContainer').style.filter = filter;
                document.querySelector('#thumbnailView').style.filter = filter;
                document.querySelector('#sidebarContent').style.background = 'var(--body-bg-color)';
            }
            else {
                document.querySelector('html').style.filter = filter;
                document.querySelector('html').style.background = 'white';
            }
        }
        const css = document.styleSheets[document.styleSheets.length - 1];
        if (this.isPrefersColorSchemeDark(params.codeColorTheme)) {
            document.querySelector('#viewerContainer').style.background = params.color.dark.backgroundColor;
            css.insertRule(`.pdfViewer.removePageBorders .page {box-shadow: 0px 0px 0px 1px ${params.color.dark.pageBorderColor}}`, css.cssRules.length);
        }
        else {
            document.querySelector('#viewerContainer').style.background = params.color.light.backgroundColor;
            css.insertRule(`.pdfViewer.removePageBorders .page {box-shadow: 0px 0px 0px 1px ${params.color.light.pageBorderColor}}`, css.cssRules.length);
        }
        if (params.keybindings) {
            this.synctex.reverseSynctexKeybinding = params.keybindings['synctex'];
            this.synctex.registerListenerOnEachPage();
        }
    }
    setupConnectionPort() {
        const openPack = {
            type: 'open',
            pdfFileUri: this.pdfFileUri,
            viewer: (this.embedded ? 'tab' : 'browser')
        };
        this.send(openPack);
        this.connectionPort.onDidReceiveMessage((event) => {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case 'synctex': {
                    this.forwardSynctex(data.data);
                    break;
                }
                case 'refresh': {
                    this.refreshPDFViewer();
                    break;
                }
                case 'reload': {
                    this.reload();
                    break;
                }
                default: {
                    break;
                }
            }
        });
        this.connectionPort.onDidClose(() => {
            document.title = `[Disconnected] ${this.documentTitle}`;
            console.log('Closed: WebScocket to LaTeX Workshop.');
            // Since WebSockets are disconnected when PC resumes from sleep,
            // we have to reconnect. https://github.com/James-Yu/LaTeX-Workshop/pull/1812
            const reconnect = (tries = 1) => () => {
                const retry = () => {
                    if (tries <= 10) {
                        tries++;
                        setTimeout(reconnect(tries), 1000 * (tries + 2));
                    }
                    else {
                        console.log('Cannot reconnect to LaTeX Workshop.');
                    }
                };
                const onOpen = () => {
                    document.title = this.documentTitle;
                    try {
                        this.setupConnectionPort();
                        console.log('Reconnected: WebSocket to LaTeX Workshop.');
                    }
                    catch {
                        retry();
                    }
                };
                console.log(`Try to reconnect to LaTeX Workshop: (${tries}/10).`);
                try {
                    this.connectionPort = createConnectionPort(this);
                    this.connectionPort.onDidOpen(onOpen);
                }
                catch {
                    retry();
                }
            };
            setTimeout(reconnect(), 3000);
        });
    }
    showToolbar(animate) {
        if (this.hideToolbarInterval) {
            clearInterval(this.hideToolbarInterval);
        }
        const d = document.getElementsByClassName('toolbar')[0];
        d.className = d.className.replace(' hide', '') + (animate ? '' : ' notransition');
        this.hideToolbarInterval = setInterval(() => {
            if (!PDFViewerApplication.findBar.opened && !PDFViewerApplication.pdfSidebar.isOpen && !PDFViewerApplication.secondaryToolbar.isOpen) {
                d.className = d.className.replace(' notransition', '') + ' hide';
                clearInterval(this.hideToolbarInterval);
            }
        }, 3000);
    }
    // Since the width of the selector of scaling depends on each locale,
    // we have to set its `max-width` dynamically on initialization.
    setCssRule() {
        let styleSheet;
        for (const style of document.styleSheets) {
            if (style.href && /latexworkshop.css/.exec(style.href)) {
                styleSheet = style;
                break;
            }
        }
        if (!styleSheet) {
            return;
        }
        const scaleSelectContainer = document.getElementById('scaleSelectContainer');
        const scaleWidth = utils.elementWidth(scaleSelectContainer);
        const numPages = document.getElementById('numPages');
        const numPagesWidth = utils.elementWidth(numPages);
        const printerButtonWidth = this.embedded ? 0 : 34;
        const smallViewMaxWidth = 380 + numPagesWidth + scaleWidth + printerButtonWidth;
        const smallViewRule = `@media all and (max-width: ${smallViewMaxWidth}px) { .hiddenSmallView, .hiddenSmallView * { display: none; } }`;
        styleSheet.insertRule(smallViewRule);
        const buttonSpacerMaxWidth = 340 + numPagesWidth + scaleWidth + printerButtonWidth;
        const buttonSpacerRule = `@media all and (max-width: ${buttonSpacerMaxWidth}px) { .toolbarButtonSpacer { width: 0; } }`;
        styleSheet.insertRule(buttonSpacerRule);
        const scaleMaxWidth = 300 + numPagesWidth + scaleWidth + printerButtonWidth;
        const scaleRule = `@media all and (max-width: ${scaleMaxWidth}px) { #scaleSelectContainer { display: none; } }`;
        styleSheet.insertRule(scaleRule);
        const trimSelectContainer = document.getElementById('trimSelectContainer');
        const trimWidth = utils.elementWidth(trimSelectContainer);
        const trimMaxWidth = 300 + numPagesWidth + scaleWidth + trimWidth + printerButtonWidth;
        const trimRule = `@media all and (max-width: ${trimMaxWidth}px) { #trimSelectContainer { display: none; } }`;
        styleSheet.insertRule(trimRule);
    }
    decodeQuery() {
        const query = document.location.search.substring(1);
        const parts = query.split('&');
        for (let i = 0, ii = parts.length; i < ii; ++i) {
            const param = parts[i].split('=');
            if (param[0].toLowerCase() === 'file') {
                const encodedPdfFilePath = param[1].replace(utils.pdfFilePrefix, '');
                const pdfFileUri = utils.decodePath(encodedPdfFilePath);
                const documentTitle = pdfFileUri.split(/[\\/]/).pop();
                return { encodedPdfFilePath, pdfFileUri, documentTitle };
            }
        }
        throw new Error('file not given in the query.');
    }
    hidePrintButton() {
        if (this.embedded) {
            const dom = document.getElementById('print');
            dom.style.display = 'none';
        }
    }
    registerKeybinding() {
        // if we're embedded we cannot open external links here. So we intercept clicks and forward them to the extension
        if (this.embedded) {
            document.addEventListener('click', (e) => {
                const target = e.target;
                if (target.nodeName === 'A' && !target.href.startsWith(window.location.href) && !target.href.startsWith('blob:')) { // is external link
                    this.send({ type: 'external_link', url: target.href });
                    e.preventDefault();
                }
            });
        }
        // keyboard bindings
        window.addEventListener('keydown', (evt) => {
            // F opens find bar, cause Ctrl-F is handled by vscode
            // const target = evt.target as HTMLElement
            // if(evt.keyCode === 70 && target.nodeName !== 'INPUT') { // ignore F typed in the search box
            //     this.showToolbar(false)
            //     PDFViewerApplication.findBar.open()
            //     evt.preventDefault()
            // }
            if (this.embedded && evt.key === 'c' && (evt.ctrlKey || evt.metaKey)) {
                const selection = window.getSelection();
                if (selection !== null && selection.toString().length > 0) {
                    this.send({ type: 'copy', content: selection.toString(), isMetaKey: evt.metaKey });
                }
            }
            // Chrome's usual Alt-Left/Right (Command-Left/Right on OSX) for history
            // Back/Forward don't work in the embedded viewer, so we simulate them.
            if (this.embedded && ((evt.altKey && !navigator.userAgent.includes('Mac OS')) ||
                (evt.metaKey && navigator.userAgent.includes('Mac OS')))) {
                if (evt.key === 'ArrowLeft') {
                    this.viewerHistory.back();
                }
                else if (evt.key === 'ArrowRight') {
                    this.viewerHistory.forward();
                }
            }
            if (evt.key === 'Backspace' && evt.target.nodeName !== 'INPUT') {
                this.viewerHistory.back();
            }
            if (evt.key === 'Backspace' && evt.shiftKey && evt.target.nodeName !== 'INPUT') {
                this.viewerHistory.forward();
            }
        });
        document.getElementById('outerContainer').onmousemove = (e) => {
            if (e.clientY <= 64) {
                this.showToolbar(true);
            }
        };
    }
    setSynctex(flag) {
        const synctexOff = document.getElementById('synctexOff');
        if (flag) {
            if (synctexOff.checked) {
                synctexOff.checked = false;
            }
            this.synctexEnabled = true;
        }
        else {
            if (!synctexOff.checked) {
                synctexOff.checked = true;
            }
            this.synctexEnabled = false;
        }
        this.sendCurrentStateToPanelManager();
    }
    registerSynctexCheckBox() {
        const synctexOff = document.getElementById('synctexOff');
        synctexOff.addEventListener('change', () => {
            this.setSynctex(!synctexOff.checked);
            PDFViewerApplication.secondaryToolbar.close();
        });
        const synctexOffButton = document.getElementById('synctexOffButton');
        synctexOffButton.addEventListener('click', () => {
            this.setSynctex(!this.synctexEnabled);
            PDFViewerApplication.secondaryToolbar.close();
        });
    }
    setAutoReload(flag) {
        const autoReloadOff = document.getElementById('autoReloadOff');
        if (flag) {
            if (autoReloadOff.checked) {
                autoReloadOff.checked = false;
            }
            this.autoReloadEnabled = true;
        }
        else {
            if (!autoReloadOff.checked) {
                autoReloadOff.checked = true;
            }
            this.autoReloadEnabled = false;
        }
        this.sendCurrentStateToPanelManager();
    }
    registerAutoReloadCheckBox() {
        const autoReloadOff = document.getElementById('autoReloadOff');
        autoReloadOff.addEventListener('change', () => {
            this.setAutoReload(!autoReloadOff.checked);
            PDFViewerApplication.secondaryToolbar.close();
        });
        const autoReloadOffButton = document.getElementById('autoReloadOffButton');
        autoReloadOffButton.addEventListener('click', () => {
            this.setAutoReload(!this.autoReloadEnabled);
            PDFViewerApplication.secondaryToolbar.close();
        });
    }
    sendToPanelManager(msg) {
        if (!this.embedded) {
            return;
        }
        window.parent?.postMessage(msg, '*');
    }
    sendCurrentStateToPanelManager() {
        const pack = this.getPdfViewerState();
        this.sendToPanelManager({ type: 'state', state: pack });
    }
    // To enable keyboard shortcuts of VS Code when the iframe is focused,
    // we have to dispatch keyboard events in the parent window.
    // See https://github.com/microsoft/vscode/issues/65452#issuecomment-586036474
    startRebroadcastingKeyboardEvent() {
        if (!this.embedded) {
            return;
        }
        document.addEventListener('keydown', e => {
            const obj = {
                altKey: e.altKey,
                code: e.code,
                keyCode: e.keyCode,
                ctrlKey: e.ctrlKey,
                isComposing: e.isComposing,
                key: e.key,
                location: e.location,
                metaKey: e.metaKey,
                repeat: e.repeat,
                shiftKey: e.shiftKey
            };
            if (utils.isPdfjsShortcut(obj)) {
                return;
            }
            this.sendToPanelManager({
                type: 'keyboard_event',
                event: obj
            });
        });
    }
    startSendingState() {
        if (!this.embedded) {
            return;
        }
        window.addEventListener('scroll', () => {
            this.sendCurrentStateToPanelManager();
        }, true);
        const events = ['scroll', 'scalechanged', 'zoomin', 'zoomout', 'zoomreset', 'scrollmodechanged', 'spreadmodechanged', 'pagenumberchanged'];
        for (const ev of events) {
            void this.getEventBus().then(eventBus => {
                eventBus.on(ev, () => {
                    this.sendCurrentStateToPanelManager();
                });
            });
        }
    }
    async startReceivingPanelManagerResponse() {
        await this.pdfViewerStarted;
        window.addEventListener('message', (e) => {
            const data = e.data;
            if (!data.type) {
                console.log('LateXWorkshopPdfViewer received a message of unknown type: ' + JSON.stringify(data));
                return;
            }
            switch (data.type) {
                case 'restore_state': {
                    if (data.state.kind !== 'not_stored') {
                        __classPrivateFieldGet(this, _LateXWorkshopPdfViewer_restoredState, "f").resolve(data.state);
                    }
                    else {
                        __classPrivateFieldGet(this, _LateXWorkshopPdfViewer_restoredState, "f").resolve(undefined);
                    }
                    break;
                }
                default: {
                    break;
                }
            }
        });
        /**
         * Since this.pdfViewerStarted is resolved, the PDF viewer has started.
         */
        this.sendToPanelManager({ type: 'initialized' });
    }
}
_LateXWorkshopPdfViewer_restoredState = new WeakMap();
const extension = new LateXWorkshopPdfViewer();
await extension.waitSetupAppOptionsFinished();
// @ts-expect-error
await import('../../viewer/viewer.js');
//# sourceMappingURL=latexworkshop.js.map