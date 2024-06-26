#include QMK_KEYBOARD_H
#include "keymap_norwegian.h"

const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
	[0] = LAYOUT_split_3x6_3(
		NO_PLUS, NO_Q, NO_J, NO_K, NO_Y, NO_W,	NO_B, NO_F, NO_U, NO_AE, NO_OSTR, NO_ARNG,

		NO_MINS, LGUI_T(NO_G), LALT_T(NO_T), LCTL_T(NO_A), LSFT_T(NO_E), NO_D,	NO_R, RSFT_T(NO_I), LCTL_T(NO_O), LALT_T(NO_S), LGUI_T(NO_H), NO_QUOT,

		NO_UNDS, NO_Z, NO_X, NO_C, NO_V, NO_M,	NO_P, NO_N, NO_L, NO_COMM, NO_DOT, KC_LGUI,
		
		CTL_T(KC_LGUI), LT(1, KC_BSPC), ALT_T(KC_TAB),   CTL_T(KC_ENT), LT(2, KC_SPC), ALT_T(KC_ESC)
    ),

	[1] = LAYOUT_split_3x6_3(
		KC_NO, KC_NO, NO_1, NO_2, NO_3, KC_BRIU,	KC_VOLU, KC_HOME, KC_UP, KC_END, KC_NO, KC_MNXT,

		KC_NO, LGUI_T(KC_NO), LALT_T(NO_4), LCTL_T(NO_5), LSFT(NO_6), NO_0,	    KC_MUTE, KC_LEFT, KC_DOWN, KC_RGHT, KC_NO, KC_MPLY,

		KC_NO, KC_NO, NO_7, NO_8, NO_9, KC_BRID,	KC_VOLD, KC_NO, KC_NO, KC_NO, KC_NO, KC_MPRV,
		
		CTL_T(KC_LGUI), LT(1, KC_BSPC), ALT_T(KC_TAB),   CTL_T(KC_ENT), LT(2, KC_SPC), ALT_T(KC_ESC)
    ),

	[2] = LAYOUT_split_3x6_3(
		KC_LALT, KC_NO, NO_CIRC, NO_LABK, NO_RABK, NO_ASTR,	NO_DLR, NO_LBRC, NO_RBRC, NO_BSLS, NO_MINS, KC_NO,

		KC_LCTL, NO_PERC, NO_HASH, NO_QUES, NO_EXLM, NO_DQUO, 	NO_EQL, NO_LPRN, NO_RPRN, NO_SLSH, NO_TILD, KC_NO,
		
		KC_LSFT, NO_DIAE, NO_SCLN, NO_COLN, NO_AT, NO_GRV,	NO_AMPR, NO_LCBR, NO_RCBR, NO_PIPE, NO_UNDS, KC_NO,
		
		CTL_T(KC_LGUI), LT(1, KC_BSPC), ALT_T(KC_TAB),   CTL_T(KC_ENT), LT(2, KC_SPC), ALT_T(KC_ESC)
    )
};
