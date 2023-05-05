;; -*- lexical-binding: t; -*-


;; Custom variables ------------------------------------------------------------
(custom-set-variables
 ;; custom-set-variables was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 '(custom-safe-themes
   '("1cae4424345f7fe5225724301ef1a793e610ae5a4e23c023076dc334a9eb940a" "1a1ac598737d0fcdc4dfab3af3d6f46ab2d5048b8e72bc22f50271fd6d393a00" "5f128efd37c6a87cd4ad8e8b7f2afaba425425524a68133ac0efd87291d05874" "3fe1ebb870cc8a28e69763dde7b08c0f6b7e71cc310ffc3394622e5df6e4f0da" "7a424478cb77a96af2c0f50cfb4e2a88647b3ccca225f8c650ed45b7f50d9525" "8d3ef5ff6273f2a552152c7febc40eabca26bae05bd12bc85062e2dc224cde9a" "512ce140ea9c1521ccaceaa0e73e2487e2d3826cc9d287275550b47c04072bc4" "2f8eadc12bf60b581674a41ddc319a40ed373dd4a7c577933acaff15d2bf7cc6" "adaf421037f4ae6725aa9f5654a2ed49e2cd2765f71e19a7d26a454491b486eb" "51c71bb27bdab69b505d9bf71c99864051b37ac3de531d91fdad1598ad247138" "9d29a302302cce971d988eb51bd17c1d2be6cd68305710446f658958c0640f68" "e7ba99d0f4c93b9c5ca0a3f795c155fa29361927cadb99cfce301caf96055dfd" "4ff1c4d05adad3de88da16bd2e857f8374f26f9063b2d77d38d14686e3868d8d" "56044c5a9cc45b6ec45c0eb28df100d3f0a576f18eef33ff8ff5d32bac2d9700" "bf948e3f55a8cd1f420373410911d0a50be5a04a8886cabe8d8e471ad8fdba8e" "b9761a2e568bee658e0ff723dd620d844172943eb5ec4053e2b199c59e0bcc22" default))
 '(global-writeroom-mode t nil (writeroom-mode))
 '(mini-frame-show-parameters '((top . 10) (width . 0.4) (left . 0.5)))
 '(package-archives
   '(("melpa" . "https://melpa.org/packages/")
     ("org" . "https://orgmode.org/elpa/")
     ("elpa" . "https://elpa.gnu.org/packages/")
     ("melpa-stable" . "http://stable.melpa.org/packages/")))
 '(package-selected-packages
   '(ivy-posframe ivy-fuz mini-frame topspace writeroom-mode forge magit visual-fill-column org-present smooth-scrolling ligature twilight-theme lua-mode a haskell-mode all-the-icons-completion dap-mode lsp-ivy lsp-treemacs lsp-ui lsp-mode all-the-icons-ivy which-key doom-modeline all-the-icons doom-themes use-package auto-package-update))
 '(writeroom-header-line t)
 '(writeroom-mode-line t))
(custom-set-faces
 ;; custom-set-faces was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 )

;; Startup &  Performance ------------------------------------------------------
;; The default is 800 kilobytes.  Measured in bytes.
(setq gc-cons-threshold (* 50 1000 1000))

;; Profile emacs startup
(add-hook 'emacs-startup-hook
          (lambda ()
            (message "*** Emacs loaded in %s with %d garbage collections."
                     (format "%.2f seconds"
                             (float-time
                              (time-subtract after-init-time before-init-time)))
                     gcs-done)))

;; Set user directory
(setq user-emacs-directory "~/.emacs.d")

;; Initialize package sources
(require 'package)

(setq package-archives '(("melpa" . "https://melpa.org/packages/")
                         ("org"   . "https://orgmode.org/elpa/")
                         ("elpa"  . "https://elpa.gnu.org/packages/")))

(package-initialize)
(unless package-archive-contents
  (package-refresh-contents))

;; Initialize use-package on non-Linux platforms
(unless (package-installed-p 'use-package)
  (package-install 'use-package))

(require 'use-package)
(setq use-package-always-ensure t)

;; Automatic package updates
;; You can also use 'M-x auto-package-update-now'
(use-package auto-package-update
  :custom
  (auto-package-update-interval             7)
  (auto-package-update-prompt-before-update t)
  (auto-package-update-hide-results         t)
  :config
  (auto-package-update-maybe)
  (auto-package-update-at-time "09:00"))



;; Appearance & UI -------------------------------------------------------------
(defvar efs/default-font-size          102)
(defvar efs/default-variable-font-size 102)

;; Add small margin around the edges of the frame
(add-to-list 'default-frame-alist '(internal-border-width . 22))

;; TODO: Add small gap between modeline and text

;; Toggle transparency with C-c t
(defun toggle-transparency ()
  (interactive)
  (let ((alpha (frame-parameter nil 'alpha)))
    (set-frame-parameter
     nil 'alpha
     (if (eql (cond ((numberp alpha) alpha)
                    ((numberp (cdr alpha)) (cdr alpha))
                    ;; Also handle undocumented (<active> <inactive>) form.
                    ((numberp (cadr alpha)) (cadr alpha)))
              100)
         '(85 . 95) '(100 . 100)))))
(global-set-key (kbd "C-c t") 'toggle-transparency)

;; Declutter
(setq inhibit-startup-message t
      initial-scratch-message nil)
(scroll-bar-mode               -1)
(tool-bar-mode                 -1)
(menu-bar-mode                 -1)
(set-fringe-mode               10)

;; Smoother scrolling
(setq mouse-wheel-scroll-amount '(1 ((shift) . 1))) ;; one line at a time
(setq mouse-wheel-progressive-speed            nil) ;; don't accelerate scrolling
(setq mouse-wheel-follow-mouse                  't) ;; scroll window under mouse
(setq scroll-step                                1) ;; keyboard scroll one line at a time
(setq use-dialog-box                           nil) ;; Disable dialog

;; Maximise by default
(set-frame-parameter (selected-frame) 'fullscreen 'maximized)
(add-to-list 'default-frame-alist  '(fullscreen . maximized))


;; Theme
(use-package doom-themes
  :init (load-theme 'doom-miramare))

;; Cycle through themes
(defun cycle-themes ()
  "Returns a function that lets you cycle your themes."
  (let ((themes '(doom-miraware doom-flatwhite doom-nord doom-opera)))
    (lambda ()
      (interactive)
      ;; Rotates the theme cycle and changes the current theme.
      (let ((rotated (nconc (cdr themes) (list (car themes)))))
        (load-theme (car (setq themes rotated)) t))
      (message (concat "Switched to " (symbol-name (car themes)))))))

;; Font
(set-face-attribute 'default nil :font "JetBrainsMono Nerd Font Mono" :height efs/default-font-size)
(set-face-attribute 'fixed-pitch nil :font "JetBrainsMono Nerd Font Mono" :height efs/default-font-size)
(set-face-attribute 'variable-pitch nil :font "Iosevka Aile" :height efs/default-variable-font-size)

;; Font ligatures
(defvar ligatures-JetBrainsMono
  '("--" "---" "==" "===" "!=" "!==" "=!=" "=:=" "=/=" "<=" ">=" "&&" "&&&" "&=" "++" "+++"
   "***" ";;" "!!" "??" "?:" "?." "?=" "<:" ":<" ":>" ">:" "<>" "<<<" ">>>" "<<" ">>" "||" "-|"
   "_|_" "|-" "||-" "|=" "||=" "##" "###" "####" "#{" "#[" "]#" "#(" "#?" "#_" "#_(" "#:"
   "#!" "#=" "^=" "<$>" "<$" "$>" "<+>" "<+ +>" "<*>" "<* *>" "</" "</>" "/>" "<!--"
   "<#--" "-->" "->" "->>" "<<-" "<-" "<=<" "=<<" "<<=" "<==" "<=>" "<==>" "==>" "=>"
   "=>>" ">=>" ">>=" ">>-" ">-" ">--" "-<" "-<<" ">->" "<-<" "<-|" "<=|" "|=>" "|->" "<-"
   "<~~" "<~" "<~>" "~~" "~~>" "~>" "~-" "-~" "~@" "[||]" "|]" "[|" "|}" "{|" "[<" ">]"
   "|>" "<|" "||>" "<||" "|||>" "|||>" "<|>" "..." ".." ".=" ".-" "..<" ".?" "::" ":::"
   ":=" "::=" ":?" ":?>" "//" "///" "/*" "*/" "/=" "//=" "/==" "@_" "__"))
(use-package ligature
  :load-path "~/.emacs.d/elpa/ligature-20220808.1225/ligature.el"
  :config
  (ligature-set-ligatures 'prog-mode ligatures-JetBrainsMono)
  (global-ligature-mode t))

;; Prettify greek letters
(setq-default prettify-symbols-alist '(("lambda" . ?λ)
                                       ("delta" . ?Δ)
                                       ("gamma" . ?Γ)
                                       ("phi" . ?φ)
                                       ("psi" . ?ψ)))

;; TODO: highlight TODO, FIXME, etc.

;; Column and line numbers
(add-hook 'prog-mode-hook 'display-line-numbers-mode)

;; Time and battery, but not load average in modeline
(display-time-mode 1)
(setq display-time-24hr-format t)
(display-battery-mode 1)
(setq display-time-default-load-average nil)

;; Modeline
(use-package all-the-icons)
(use-package doom-modeline
  :init (doom-modeline-mode 1))
(setq doom-modeline-bar-width 6           ;; bar width
      doom-modeline-height 30             ;; modeline height
      ;; doom-modeline-major-mode-icon nil   ;; remove major mode icon
      doom-modeline-buffer-state-icon nil ;; remove buffer state icon
      doom-modeline-buffer-modification-icon nil ;; remove buffer modification icon
      doom-modeline-buffer-encoding nil   ;; remove buffer encoding
      doom-modeline-time-icon nil         ;; remove time icon - only want actual time
      doom-modeline-time t                ;; time, but only if 'display-time-mode' is used!
      doom-modeline-battery t             ;; battery, but only if 'display-battery-mode' is used!
      doom-modeline-buffer-file-name-style 'file-name ;; display file name, not entire path
      )

;; Put modeline in the header instead of the default, in the footer
(add-to-list 'load-path  "~/.emacs.d/elpa/mode-line-in-header/")
(require 'mode-line-in-header)
(global-mode-line-in-header 1)

;; Display mini-buffer as separate child frame
;; Maybe use ivy-posframe instead?
;; (mini-frame-mode 1)

;; Display minibuffer as separate frame, in conjunction with Ivy
(require 'ivy-posframe)
;; display at `ivy-posframe-style'
(setq ivy-posframe-display-functions-alist '((t . ivy-posframe-display)))
;; (setq ivy-posframe-display-functions-alist '((t . ivy-posframe-display-at-frame-center)))
(setq ivy-posframe-display-functions-alist '((t . ivy-posframe-display-at-window-center)))
(setq ivy-posframe-height ivy-height)      ; Maintain the height given by ivy
(setq ivy-posframe-min-width 100)
;; (setq ivy-posframe-display-functions-alist '((t . ivy-posframe-display-at-frame-bottom-left)))
;; (setq ivy-posframe-display-functions-alist '((t . ivy-posframe-display-at-window-bottom-left)))
;; (setq ivy-posframe-display-functions-alist '((t . ivy-posframe-display-at-frame-top-center)))
(ivy-posframe-mode 1)

;; Make symlinks show up as their actual filename
(setq find-file-visit-truename t)

;; Break lines
(global-visual-line-mode 1)

;; Center text
(with-eval-after-load 'olivetti
  (setq-default olivetti-body-width (+ fill-column 3))
  (remove-hook 'olivetti-mode-on-hook 'visual-line-mode))

;; Writeroom mode
(use-package writeroom-mode)


;; Interaction Tools -----------------------------------------------------------
;; Which key
(use-package which-key
  :defer 0
  :diminish which-key-mode
  :config
  (which-key-mode)
  (setq which-key-idle-delay 1))

;; Ivy
(use-package ivy
  :diminish
  :bind (("C-s" . swiper)
         :map ivy-minibuffer-map
         ("TAB" . ivy-alt-done)
         ("C-l" . ivy-alt-done)
         ("C-j" . ivy-next-line)
         ("C-k" . ivy-previous-line)
         :map ivy-switch-buffer-map
         ("C-k" . ivy-previous-line)
         ("C-l" . ivy-done)
         ("C-d" . ivy-switch-buffer-kill)
         :map ivy-reverse-i-search-map
         ("C-k" . ivy-previous-line)
         ("C-d" . ivy-reverse-i-search-kill))
  :config
  (ivy-mode 1))

;; Ivy Rich
(use-package ivy-rich
  :after ivy
  :init
  (ivy-rich-mode 1))

;; Counsel
(use-package counsel
  :bind (("C-M-j" . 'counsel-switch-buffer)
         :map minibuffer-local-map
         ("C-r" . 'counsel-minibuffer-history))
  :custom
  (counsel-linux-app-format-function #'counsel-linux-app-format-function-name-only)
  :config
  (counsel-mode 1))

;; Prescient
(use-package ivy-prescient
  :after counsel
  :custom
  (ivy-prescient-enable-filtering nil)
  :config
  ;; Uncomment the following line to have sorting remembered across sessions!
  ;(prescient-persist-mode 1)
  (ivy-prescient-mode 1))

;; Fuzzy searching for Ivy
(use-package ivy-fuz
  :ensure t
  :demand t
  :after ivy
  :custom
  (ivy-sort-matches-functions-alist '((t . ivy-fuz-sort-fn)))
  (ivy-re-builders-alist '((t . ivy-fuz-regex-fuzzy)))
  :config
  (add-to-list 'ivy-highlight-functions-alist '(ivy-fuz-regex-fuzzy . ivy-fuz-highlight-fn)))

;; Helpful
(use-package helpful
 :commands (helpful-callable helpful-variable helpful-command helpful-key)
 :custom
 (counsel-describe-function-function #'helpful-callable)
 (counsel-describe-variable-function #'helpful-variable)
 :bind
 ([remap describe-function] . counsel-describe-function)
 ([remap describe-command] . helpful-command)
 ([remap describe-variable] . counsel-describe-variable)
 ([remap describe-key] . helpful-key))

;; TODO: Better code & text autocompletion


;; Git -------------------------------------------------------------------------
(setq auth-sources '("~/.authinfo"))

(use-package magit
 :commands magit-status
 :custom
 (magit-display-buffer-function #'magit-display-buffer-same-window-except-diff-v1))

(use-package forge
 :after magit)

;; Development & Programming Setups --------------------------------------------
;; lsp mode and accompanying packages
(defun efs/lsp-mode-setup ()
  (setq lsp-headerline-breadcrumb-segments '(path-up-to-project file symbols))
  (lsp-headerline-breadcrumb-mode))
(use-package lsp-mode
  :commands (lsp lsp-deferred)
  :hook (lsp-mode . efs/lsp-mode-setup)
  :init
  (setq lsp-keymap-prefix "C-c l")  ;; Or 'C-l', 's-l'
  :config
  (lsp-enable-which-key-integration t))
(use-package lsp-ui
  :hook (lsp-mode . lsp-ui-mode)
  :custom
  (lsp-ui-doc-position 'bottom))

;; Gives you tree-like file browser
(use-package lsp-treemacs
  :after lsp)

;; lsp-ivy lets you search for things by name in your code
(use-package lsp-ivy
  :after lsp)


;; ;; Debugging with the debugger adapter protocol!
(use-package dap-mode
  ;; Uncomment the config below if you want all UI panes to be hidden by default!
  :custom
  (lsp-enable-dap-auto-configure nil)
  :commands dap-debug
  :config (dap-ui-mode 1)

  ;; Bind `C-c l d` to `dap-hydra` for easy access
  (general-define-key
    :keymaps 'lsp-mode-map
    :prefix lsp-keymap-prefix
    "d" '(dap-hydra t :wk "debugger")))

;; Python using lsp and dap, with the pyls language server
(use-package python-mode
  :ensure t
  :hook (python-mode . lsp-deferred)
  :custom
  ;; NOTE: Set these if Python 3 is called "python3" on your system!
  ;; (python-shell-interpreter "python3")
  ;; (dap-python-executable "python3")
  (dap-python-debugger 'debugpy)
  :config
  (require 'dap-python))
(use-package pyvenv
  :after python-mode
  :config
  (pyvenv-mode 1))


;; Programming Keybindings & Behaviours ----------------------------------------

;; Comment/uncomment with C-'
(use-package evil-nerd-commenter
  :bind ("C-'" . evilnc-comment-or-uncomment-lines))

;; Coloured bracket pairs
(use-package rainbow-delimiters
  :hook (prog-mode . rainbow-delimiters-mode))

;; Auto-pair brackets
(electric-pair-mode t)

;; TODO:  Shift-tab to undo indentation

;; TODO: Change ctrl + backspace behaviour to calm it down


;; Presentations ---------------------------------------------------------------
(unless (package-installed-p 'org-present)
  (package-install 'org-present))

(defun my/org-present-start ()
  ;; Tweak font sizes in presentation mode
  (setq-local face-remapping-alist '((default (:height 2.0) variable-pitch)
				    (header-line (:height 5.0) variable-pitch)
				    (org-document-title (:height 2.0) org-document-title)
				    (org-code (:height 1.25) org-code)
				    (org-verbatim (:height 1.25) org-verbatim)
				    (org-block (:height 1.25) org-block)
				    (org-block-begin-line (:height 3.0) org-block)))
  ;; Set a blank header line string to create blank space at the top
  (setq header-line-format " "))

(defun my/org-present-end ()
  ;; Reset font customisations
  (setq-local face-remapping-alist '((default variable-pitch default)))
  ;; Clear the header line format by setting to `nil'
  (setq header-line-format nil))

;; Registering start and end hooks in org-present
(add-hook 'org-present-mode-hook 'my/org-present-start)
(add-hook 'org-present-mode-quit-hook 'my/org-present-end)


;; Org Mode --------------------------------------------------------------------
;; Load org-faces to make sure we can set appropriate faces
(require 'org-faces)

;; Hide emphasis markers on formatted text
(setq org-hide-emphasis-markers t)

;; Resize Org headings
(dolist (face '((org-level-1 . 1.5)
                (org-level-2 . 1.3)
                (org-level-3 . 1.1)
                (org-level-4 . 1.0)
                (org-level-5 . 1.0)
                (org-level-6 . 1.0)
                (org-level-7 . 1.0)
                (org-level-8 . 1.0)))
  (set-face-attribute (car face) nil :font "Iosevka Aile" :weight 'medium :height (cdr face)))

;; Make the document title a bit bigger
(set-face-attribute 'org-document-title nil :font "Iosevka Aile" :weight 'bold :height 1.85)

;; Make sure certain org faces use the fixed-pitch face when variable-pitch-mode is on
(set-face-attribute 'org-block nil :foreground nil :inherit 'fixed-pitch)
(set-face-attribute 'org-table nil :inherit 'fixed-pitch)
(set-face-attribute 'org-formula nil :inherit 'fixed-pitch)
(set-face-attribute 'org-code nil :inherit '(shadow fixed-pitch))
(set-face-attribute 'org-verbatim nil :inherit '(shadow fixed-pitch))
(set-face-attribute 'org-special-keyword nil :inherit '(font-lock-comment-face fixed-pitch))
(set-face-attribute 'org-meta-line nil :inherit '(font-lock-comment-face fixed-pitch))
(set-face-attribute 'org-checkbox nil :inherit 'fixed-pitch)

(unless (package-installed-p 'visual-fill-column)
  (package-install 'visual-fill-column))

;; Center text
(setq visual-fill-column-width 110
      visual-fill-column-center-text t)

;; Enable text centering and line breaks for Org Mode
(defun my/org-mode-visual-style ()
  (visual-fill-column-mode t)
  (visual-fill-line-mode t))

(add-hook 'org-mode-hook 'my/org-mode-visual-style)
