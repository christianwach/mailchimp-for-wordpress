var FieldHelper = function(tabs, editor) {
	'use strict';

	window.m = require('../third-party/mithril.js');
	var $ = window.jQuery;
	var selectedListsInputs = document.querySelectorAll('.mc4wp-list-input');
	var lists = mc4wp_vars.mailchimp.lists;
	var forms = require('./FieldForms.js');
	var selectedLists = [];
	var availableFields = {};
	var chosenFieldTag = m.prop('');
	var chosenField;
	var active = false;
	var config = {
		name: m.prop(''),
		useParagraphs: m.prop(false),
		defaultValue: m.prop(''),
		isRequired: m.prop(false),
		usePlaceholder: m.prop(true),
		label: m.prop(''),
		type: m.prop('text')
	};

	var render = require('./Render.js');
	var beautify = require('../third-party/beautify-html.js');

	/**
	 * Recalculate which lists are selected
	 *
	 * @returns {Array}
	 */
	function updateSelectedLists() {
		selectedLists = [];
		$.map(selectedListsInputs, function(input) {
			if( ! input.checked ) return;
			if( typeof( lists[ input.value ] ) === "object" ){
				selectedLists.push( lists[ input.value ] );
			}
		});

		updateAvailableFields();
		return selectedLists;
	}

	/**
	 * Update the available MailChimp fields to choose from
	 *
	 * @returns {{}}
	 */
	function updateAvailableFields() {
		availableFields = {};

		selectedLists.map(function(list) {
			return list.merge_vars.map(function(field) {
				if( typeof( availableFields[ field.tag ] === "undefined" ) ) {
					availableFields[ field.tag ] = field;
				}
			});
		});

		chooseField('');
		return availableFields;
	}

	/**
	 * Choose a field to open the helper form for
	 *
	 * @param value
	 * @returns {*}
	 */
	function chooseField(value) {

		if( typeof(value) !== "string" ) {
			return chooseField('');
		}

		chosenFieldTag(value);
		chosenField = availableFields[ chosenFieldTag() ];
		active = typeof(chosenField) === "object";

		if( active ) {
			config.name(chosenField.tag);
			config.defaultValue(chosenField.name);
			config.isRequired(chosenField.req);
			config.label(chosenField.name);
		}

		m.redraw();
	}


	/**
	 * Controller
	 */
	function controller() {
		updateSelectedLists();

		window.addEventListener('keydown', function(e) {
			if(e.keyCode !== 27) return;
			chooseField('');
		});

		Array.prototype.map.call( selectedListsInputs, function(input) {
			input.addEventListener('change', updateSelectedLists);
		});
	}

	/**
	 * Create HTML based on current config object
	 */
	function createHTML() {

		var label = config.label().length ? m("label", config.label()) : '';
		var field_attributes =  {
			type: config.type(),
			name: config.name()
		};

		if( config.usePlaceholder() == true ) {
			field_attributes.placeholder = config.defaultValue();
		} else {
			field_attributes.value = config.defaultValue();
		}

		field_attributes.required = config.isRequired();

		var field = m( 'input', field_attributes );
		var html = config.useParagraphs() ? m('p', [ label, field ]) : [ label, field ];

		// render HTML
		var rawHTML = render( html );
		rawHTML = html_beautify( rawHTML , { end_with_newline: true });

		// add to editor
		editor.replaceSelection( rawHTML );

		// reset field form
		chooseField('');
	}

	/**
	 * View
	 *
	 * @param ctrl
	 * @returns {*}
	 */
	function view( ctrl ) {

		if( selectedLists.length === 0 ) {
			return m( "div.mc4wp-notice", [
				m("p", [
					m("a", {
						href: 'javascript:void(0)',
						onclick: function() { tabs.open('settings') }
					}, "Please select at least one MailChimp list in order to build your form." )
				])
			]);
		}

		// build DOM for fields choice
		var fieldsChoice = m( "div.available-fields.small-margin", [
			m("strong", "Choose a MailChimp field to add to the form"),
			$.map(Object.keys(availableFields),function(key) {
				var field = availableFields[key];
				return [
					m("button", {
						class  : "button",
						type   : 'button',
						onclick: m.withAttr("value", chooseField),
						value  : field.tag
					}, field.name)
				];
			})
		]);

		// build DOM for overlay
		var overlay = null;
		if( active ) {
			overlay = [
				m( "div.overlay",[
					m("div.overlay-content", [

						// close icon
						m('span.close.dashicons.dashicons-no', {
							title: "Click to close the overlay.",
							onclick: chooseField
						}),

						// field wizard
						m("div.field-wizard", [

							//heading
							m("h3", [
								chosenField.name,
								m("code", chosenField.tag)
							]),

							// actual form
							forms.render(chosenField.field_type, config),

							// add to form button
							m("p", [
								m("button", {
									class: "button-primary",
									type: "button",
									onclick: createHTML
								}, "Add to form" )
							])
						])
					])
				]),

				// overlay background
				m( "div.overlay-background", {
					title: "Click to close the overlay.",
					onclick: chooseField
				})
			];
		}

		return [
			fieldsChoice,
			overlay
		];
	}

	// expose some variables
	return {
		view: view,
		controller: controller
	}
};

module.exports = FieldHelper;