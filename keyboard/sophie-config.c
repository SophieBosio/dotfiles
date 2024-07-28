#include QMK_KEYBOARD_H
#include "keymap_norwegian.h"

enum layer_names {
    _LINUX_ALPHA,
    _LINUX_SYMBOL,
    _LINUX_NAV,
    _MAC_ALPHA,
    _MAC_SYMBOL,
    _MAC_NAV
};

enum custom_keycodes {
    DF_LINUX = SAFE_RANGE,
    DF_MAC,
};

const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
	[_LINUX_ALPHA] = LAYOUT_split_3x6_3(
		NO_PLUS, NO_Q, NO_J, NO_K, NO_Y, NO_W,	NO_G, NO_P, NO_N, NO_AE, NO_OSTR, NO_ARNG,

		         // Super      // Alt/Meta   // Ctrl       // Shift
		NO_MINS, LGUI_T(NO_U), LALT_T(NO_T), LCTL_T(NO_A), LSFT_T(NO_E), NO_D,	NO_O, RSFT_T(NO_R), LCTL_T(NO_I), LALT_T(NO_S), LGUI_T(NO_L), NO_QUOT,

		NO_UNDS, NO_Z, NO_X, NO_C, NO_V, NO_M,	NO_H, NO_B, NO_F, NO_COMM, NO_DOT, NO_MINS,
		
		CTL_T(KC_LGUI), LT(_LINUX_NAV, KC_BSPC), ALT_T(KC_TAB),   CTL_T(KC_ENT), LT(_LINUX_SYMBOL, KC_SPC), ALT_T(KC_ESC)
    ),

	[_LINUX_NAV] = LAYOUT_split_3x6_3(
		DF_MAC, KC_NO, NO_1, NO_2, NO_3, KC_BRIU,	KC_VOLU, KC_HOME, KC_UP, KC_END, KC_NO, KC_MNXT,

		KC_NO, LGUI_T(KC_NO), LALT_T(NO_4), LCTL_T(NO_5), LSFT(NO_6), NO_0,	    KC_MUTE, KC_LEFT, KC_DOWN, KC_RGHT, KC_NO, KC_MPLY,

		KC_NO, KC_NO, NO_7, NO_8, NO_9, KC_BRID,	KC_VOLD, KC_NO, KC_NO, KC_NO, KC_NO, KC_MPRV,
		
		CTL_T(KC_LGUI), LT(_LINUX_NAV, KC_BSPC), ALT_T(KC_TAB),   CTL_T(KC_ENT), LT(_LINUX_SYMBOL, KC_SPC), ALT_T(KC_ESC)
    ),

	[_LINUX_SYMBOL] = LAYOUT_split_3x6_3(
		KC_LALT, NO_ACUT, NO_CIRC, NO_LABK, NO_RABK, NO_ASTR,	NO_DLR, NO_LBRC, NO_RBRC, NO_BSLS, NO_MINS, KC_NO,

		KC_LCTL, NO_PERC, NO_HASH, NO_QUES, NO_EXLM, NO_DQUO, 	NO_EQL, NO_LPRN, NO_RPRN, NO_SLSH, NO_TILD, KC_NO,
		
		KC_LSFT, NO_DIAE, NO_SCLN, NO_COLN, NO_AT, NO_GRV,	NO_AMPR, NO_LCBR, NO_RCBR, NO_PIPE, NO_UNDS, KC_NO,
		
		CTL_T(KC_LGUI), LT(_LINUX_NAV, KC_BSPC), ALT_T(KC_TAB),   CTL_T(KC_ENT), LT(_LINUX_SYMBOL, KC_SPC), ALT_T(KC_ESC)
    ),

	[_MAC_ALPHA] = LAYOUT_split_3x6_3(
		NO_PLUS, NO_Q, NO_J, NO_K, NO_Y, NO_W,	NO_G, NO_P, NO_N, NO_AE, NO_OSTR, NO_ARNG,

		         // Option ⌥   // Command ⌘  // Control ^  // Shift ⇧
		NO_MINS, LALT_T(NO_U), LGUI_T(NO_T), LCTL_T(NO_A), LSFT_T(NO_E), NO_D,	NO_O, RSFT_T(NO_R), LCTL_T(NO_I), LGUI_T(NO_S), LALT_T(NO_L), NO_QUOT,

		NO_UNDS, NO_Z, NO_X, NO_C, NO_V, NO_M,	NO_H, NO_B, NO_F, NO_COMM, NO_DOT, NO_MINS,
		
		// Control ^                           // Command ⌘     // Control ^                            // Command ⌘
		CTL_T(KC_LGUI), LT(_MAC_NAV, KC_BSPC), GUI_T(KC_TAB),   CTL_T(KC_ENT), LT(_MAC_SYMBOL, KC_SPC), GUI_T(KC_ESC)
    ),

	[_MAC_NAV] = LAYOUT_split_3x6_3(
		DF_LINUX, KC_NO, NO_1, NO_2, NO_3, KC_BRIU,	KC_VOLU, KC_HOME, KC_UP, KC_END, KC_NO, KC_MNXT,

		KC_NO, LALT_T(KC_NO), LGUI_T(NO_4), LCTL_T(NO_5), LSFT(NO_6), NO_0,	    KC_MUTE, KC_LEFT, KC_DOWN, KC_RGHT, KC_NO, KC_MPLY,

		KC_NO, KC_NO, NO_7, NO_8, NO_9, KC_BRID,	KC_VOLD, KC_NO, KC_NO, KC_NO, KC_NO, KC_MPRV,
		
		CTL_T(KC_LGUI), LT(1, KC_BSPC), GUI_T(KC_TAB),   CTL_T(KC_ENT), LT(2, KC_SPC), GUI_T(KC_ESC)
    ),

	[_MAC_SYMBOL] = LAYOUT_split_3x6_3(
		KC_LALT, NO_ACUT, NO_CIRC, NO_LABK, NO_RABK, NO_ASTR,	NO_DLR, NO_LBRC, NO_RBRC, NO_BSLS, NO_MINS, KC_NO,

		KC_LCTL, NO_PERC, NO_HASH, NO_QUES, NO_EXLM, NO_DQUO, 	NO_EQL, NO_LPRN, NO_RPRN, NO_SLSH, NO_TILD, KC_NO,
		
		KC_LSFT, NO_DIAE, NO_SCLN, NO_COLN, NO_AT, NO_GRV,	NO_AMPR, NO_LCBR, NO_RCBR, NO_PIPE, NO_UNDS, KC_NO,
		
		CTL_T(KC_LGUI), LT(1, KC_BSPC), GUI_T(KC_TAB),   CTL_T(KC_ENT), LT(2, KC_SPC), GUI_T(KC_ESC)
    )
};

bool process_record_user(uint16_t keycode, keyrecord_t *record) {
    switch (keycode) {
        case DF_LINUX:
            if (record->event.pressed) {
                set_single_persistent_default_layer(_LINUX_ALPHA);
            }
            return false;
        case DF_MAC:
            if (record->event.pressed) {
                set_single_persistent_default_layer(_MAC_ALPHA);
            }
            return false;
    }
    return true;
}

void matrix_init_user(void) {
    set_single_persistent_default_layer(_LINUX_ALPHA); // Linux is my default keymap
}
