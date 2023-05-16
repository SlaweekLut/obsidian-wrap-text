import { App, Editor, MarkdownView, Modal, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface ISettings {
	prefix: string;
	emmetFormat: boolean;
	pressetsClass: Array<string>;
	defaultTag: string;
	createdStyle: Array<ICreateStyle>;
}

interface ICreatePropertyStyle {
	// [key: string]: string,
	property: string,
	name: string,
	description: string,
	type?: string
}

interface ICreateStyle {
	// [key: string]: string,
	classname?: string,
	"font-size"?: string,
	"line-height"?: string,
	"letter-spacing"?: string,
	"font-weight"?: string,
	color?: string,
	background?: string,
	margin?: string,
	padding?: string
}

const DEFAULT_SETTINGS: ISettings = {
	prefix: '',
	emmetFormat: false,
	pressetsClass: ['hidden-text'],
	defaultTag: 'span',
	createdStyle: [],
}


let createStyleFields: Array<ICreatePropertyStyle> = [
	{
		property: 'classname',
		name: 'Class name',
		description: 'REQUIRED*'
	},
	{
		property: 'font-size',
		name: 'Font size',
		description: 'px, em, rem, %'
	},
	{
		property: 'line-height',
		name: 'Line height',
		description: 'px, em, rem, %'
	},
	{
		property: 'letter-spacing',
		name: 'Letter spacing',
		description: 'px, em, rem, %'
	},
	{
		property: 'font-weight',
		name: 'Font weight',
		description: '100, 200, 300, 400, 500, 600, 700, 800, 900'
	},
	{
		property: 'color',
		name: 'Color',
		description: 'hex, rgb, rgba, hsl, hsla',
		type: 'color'
	},
	{
		property: 'background',
		name: 'Background color',
		description: 'hex, rgb, rgba, hsl, hsla',
		type: 'color'
	},
	{
		property: 'margin',
		name: 'Margin',
		description: 'margin: top, right, bottom, left'
	},
	{
		property: 'padding',
		name: 'Padding',
		description: 'padding: top, right, bottom, left'
	}
]

let createStyle: ICreateStyle = {
	classname: '',
	"font-size": '',
	"line-height": '',
	"letter-spacing": '',
	"font-weight": '',
	color: '',
	background: '',
	margin: '',
	padding: ''
}

function removeOpenTag(text: String) {
	return text.replace(text.slice(text.indexOf('<'), text.indexOf('>') + 1), '');
}

function removeCloseTag(text: String) {
	return text.replace(text.slice(text.lastIndexOf('</'), text.lastIndexOf('>') + 1), '');
}

function removeFullTag(text: String) {
	let withoutOpenTag = removeOpenTag(text);
	return removeCloseTag(withoutOpenTag);
}

function replaceSelectedText(editor: Editor, settings: ISettings, tag: String, className: String) {
	editor.replaceSelection(`<${tag} class="${settings.prefix}${className}">${editor.getSelection()}</${tag}>`);
}

async function addStyle(plugin: WRAP_TEXT) {
	let cloneCreatedStyle: ICreateStyle = {}
	for (const property in createStyle) {
		if (Object.prototype.hasOwnProperty.call(createStyle, property)) {
			const propertyValue = createStyle[property];
			if(propertyValue !== '') {
				cloneCreatedStyle[property] = propertyValue
			}
		}
	}
	plugin.settings.createdStyle.push(cloneCreatedStyle)
	await plugin.saveSettings().then(() => {
		convertObjectToStringStyle();
	});
}

function convertObjectToStringStyle(createdStyle?: ICreateStyle) {
	// console.log(createdStyle)
	let stringStyle = ''
	if(createdStyle) {
		stringStyle = `.${createdStyle.classname} {`;
		for (const property in createdStyle) {
			if (Object.prototype.hasOwnProperty.call(createdStyle, property)) {
				const propertyValue = createdStyle[property];
				if(propertyValue !== '' && property !== 'classname') {
					stringStyle += `${property}: ${propertyValue};`
				}
			}
		}
	} else {
		stringStyle = `.${createStyle.classname} {`;
		for (const property in createStyle) {
			if (Object.prototype.hasOwnProperty.call(createStyle, property)) {
				const propertyValue = createStyle[property];
				if(propertyValue !== '' && property !== 'classname') {
					stringStyle += `${property}: ${propertyValue};`
					createStyle[property] = ''
				}
			}
		}
	}
	stringStyle += `}\n`;
	let presetsWrapperText = document.getElementById('presets-wrapper-text')
	if(presetsWrapperText) presetsWrapperText.innerHTML += stringStyle
}

function convertClassnameToName(text: String) {
	return text.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
}
export default class WRAP_TEXT extends Plugin {
	settings: ISettings;

	async onload() {
		await this.loadSettings().then( () => {
			// this.settings.createdStyle = [];
			// this.saveSettings()
			document.getElementById('presets-wrapper-text')?.remove()
			let styleElement: HTMLStyleElement = document.createElement('style');
			styleElement.id = 'presets-wrapper-text';
			document.head.append(styleElement);

			console.log('Load', this.settings.createdStyle)

			this.settings.createdStyle.forEach(style => {
				convertObjectToStringStyle(style);
			})
		});

		this.addCommand({
			id: 'presets-wrapper-text',
			name: 'Presets wrapper for selected text',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				new PresetModal(this.app, editor, this.settings).open();
			}
		});

		this.addCommand({
			id: 'wrapper-selected-text',
			name: 'Wrap selected text',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				new ClassTagModal(this.app, editor, this.settings).open();
			}
		});

		this.addCommand({
			id: 'unwrap-selected-text',
			name: 'Unwrap selected text',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				let selectedText = removeFullTag(editor.getSelection());
				editor.replaceSelection(selectedText);
			}
		});

		this.addCommand({
			id: 'create-style',
			name: 'Create style',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				new StyleModal(this.app, this.settings, this).open();
			}
		})

		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class StyleModal extends Modal {
	settings: ISettings;
	plugin: WRAP_TEXT;

	constructor(app: App, settings: ISettings, plugin: WRAP_TEXT) {
		super(app);
		this.settings = settings;
		this.plugin = plugin
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.createEl("h1", { text: "Create style" });

		createStyleFields.forEach((property) => {
			if(property.type === 'color') {
				new Setting(contentEl)
					.setName(property.name)
					.setDesc(property.description)
					.setClass("setting-item--create-style")
					.addColorPicker((color) => color
						.onChange((value) => {
							createStyle[property.property] = value
							exampleText.style[property.property] = value
						}));
			} else {
				new Setting(contentEl)
					.setName(property.name)
					.setDesc(property.description)
					.setClass("setting-item--create-style")
					.addText((text) => text
						.onChange((value) => {
							createStyle[property.property] = value
							exampleText.style[property.property] = value
						}));
			}
		})

		let exampleTextWrapper: HTMLElement = contentEl.createEl('div', { cls: ["example-text", "setting-item"] })
		let exampleText: HTMLElement = exampleTextWrapper.createEl('p', { cls: ["example-text"] })
		exampleText.innerHTML = "Lorem ipsum dolor sit amet"

		new Setting(contentEl)
			.addButton((button) => button
				.setButtonText('Close')
				.onClick(async () => {
					this.close();
				}))
			.addButton((button) => button
				.setButtonText('Add style')
				.onClick(async () => {
					if(createStyle.className === '') return alert('Class name is empty')
					if (this.settings.createdStyle.some(style => style.classname === createStyle.classname)) return alert('Style already exists')
					addStyle(this.plugin)
					exampleText.style = ''
					document.querySelectorAll('.setting-item--create-style input').forEach((input: HTMLInputElement) => {
						input.value = ''
					})
				}))
			.addButton((button) => button
				.setButtonText('Done')
				.setCta()
				.onClick(async () => {
					if(createStyle.className === '') return alert('Class name is empty')
					if (this.settings.createdStyle.some(style => style.classname === createStyle.classname)) return alert('Style already exists')
					addStyle(this.plugin)
					this.close();
				}));
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class PresetModal extends Modal {
	editor: Editor;
	settings: ISettings;
	constructor(app: App, editor: Editor, settings: ISettings) {
		super(app);
		this.editor = editor;
		this.settings = settings
	}

	onOpen() {
		const {contentEl} = this;
		let options: Record<string, string> = {};
		let selectClass = 'hidden-text'
		let partSelectedTextForExample = this.editor.getSelection().split(' ').slice(0, 10).join(' ')
		contentEl.createEl("h1", { text: "Choose a preset" });
		
		this.settings.pressetsClass.forEach((className) => {
			options[className] = convertClassnameToName(className)
		})
		
		new Setting(contentEl)
			.setName(convertClassnameToName('Select a preset'))
			.addDropdown((btn) => btn
				.addOptions(options)
				.onChange((value) => {
					selectClass = value
					contentEl.find('.wrapper-text-example-text').children[0].setAttr('class', value)
					// this.editor.replaceSelection(`<span class="${value}">${this.editor.getSelection()}</span>`);
					// this.close()
				}))
		
		let exampleText = contentEl.createEl("div", { cls: ["wrapper-text-example-text", "setting-item"] });
		exampleText.createEl("p", { text: partSelectedTextForExample, cls: selectClass });

		new Setting(contentEl)
			.addButton((btn) => btn
				.setButtonText("Done")
				.setCta()
				.onClick(() => {
					replaceSelectedText(this.editor, this.settings, this.settings.defaultTag ? this.settings.defaultTag : 'span', selectClass);
					this.close();
				}));
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class ClassTagModal extends Modal {
	editor: Editor;
	settings: ISettings;

	constructor(app: App, editor: Editor, settings: ISettings) {
		super(app);
		this.editor = editor;
		this.settings = settings;
	}

	onOpen() {
		const {contentEl} = this;
		let wrapperTag = ''
		let wrapperClass = ''
		contentEl.createEl("h1", { text: "Write tag and class name" });
		if(this.settings.emmetFormat){
			new Setting(contentEl)
				.setName("tag.class")
				.setDesc("or only .class")
				.addText((text) =>
					text.onChange((value) => {
						wrapperTag = value.split('.')[0]
						if(value.split('.').length >= 2) {
							let wrapperClassArray = value.split('.')
							wrapperClassArray.shift()
							wrapperClass = wrapperClassArray.join(' ')
						}
					}));
		} else {
			new Setting(contentEl)
				.setName("tag")
				.addText((text) =>
					text.onChange((value) => {
						wrapperTag = value
					}));
			
			new Setting(contentEl)
				.setName("class")
				.addText((text) =>
					text.onChange((value) => {
						wrapperClass = value
					}));
		}

		new Setting(contentEl)
			.addButton((btn) => btn
				.setButtonText("Done")
				.setCta()
				.onClick(() => {
					replaceSelectedText(this.editor, this.settings, wrapperTag ? wrapperTag : this.settings.defaultTag, wrapperClass);
					this.close();
				}));
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: WRAP_TEXT;

	constructor(app: App, plugin: WRAP_TEXT) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h1', {text: 'Settings'});

		new Setting(containerEl)
			.setName('Prefix')
			.setDesc('All classes will be prefixed')
			.addText(text => text
				.setPlaceholder('Enter your prefix')
				.setValue(this.plugin.settings.prefix)
				.onChange(async (value) => {
					this.plugin.settings.prefix = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default tag')
			.addText(text => text
				.setPlaceholder('span')
				.setValue(this.plugin.settings.prefix)
				.onChange(async (value) => {
					this.plugin.settings.prefix = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
		.setName('Emmet Format')
		.setDesc(`
			With emmet format you can write tag.class.class etc. \n
			Without emmet format you write tag and class in two input.`)
		.addToggle(toggle => toggle
			.setValue(this.plugin.settings.emmetFormat)
			.onChange(async (value) => {
				this.plugin.settings.emmetFormat = value;
				await this.plugin.saveSettings();
			}));

		new Setting(containerEl)
			.setName('Presets class')
			.setDesc('Write classes separated by commas')
			.addText(text => text
				.setPlaceholder('Enter your classes')
				.setValue(this.plugin.settings.pressetsClass.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.pressetsClass = value.split(', ');
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Delete created style')
			.addButton((btn) => btn
				.setButtonText('Delete')
				.onClick(async () => {
					if(confirm('Are you sure?')) {
						this.plugin.settings.createdStyle = []
						let presetsWrapperText = document.getElementById('presets-wrapper-text')
						if(presetsWrapperText) presetsWrapperText.innerHTML = ''
						await this.plugin.saveSettings();
					}
				}));

		// new Setting(containerEl)
		// 	.setName('Download .css file')
		// 	.addButton((btn) => btn
		// 		.setButtonText('Download')
		// 		.onClick(async () => {
					
		// 		}));
	}
}
