import { App, Editor, MarkdownView, Modal, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface SETTINGS {
	prefix: string;
	emmetFormat: boolean;
}

const DEFAULT_SETTINGS: SETTINGS = {
	prefix: '',
	emmetFormat: false,
}

function removeOpenTag(text: String) {
	return text.replace(text.slice(text.indexOf('<'), text.indexOf('>') + 1), '');
}

function removeCloseTag(text: String) {
	return text.replace(text.slice(text.lastIndexOf('</'), text.lastIndexOf('>') + 1), '');
}

function removeAllTags(text: String) {
	let withoutOpenTag = removeOpenTag(text);
	console.log(withoutOpenTag)
	return removeCloseTag(withoutOpenTag);
}

export default class WRAP_TEXT extends Plugin {
	settings: SETTINGS;

	async onload() {
		await this.loadSettings();

		// this.addCommand({
		// 	id: 'presets-wrapper-text',
		// 	name: 'Presets wrapper for selected text',
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		new PresetModal(this.app, editor).open();
		// 	}
		// });

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
				let selectedText = removeAllTags(editor.getSelection());
				editor.replaceSelection(selectedText);
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
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

class PresetModal extends Modal {
	editor: Editor;
	constructor(app: App, editor: Editor) {
		super(app);
		this.editor = editor;
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.createEl("h1", { text: "Choose a preset" });

		new Setting(contentEl)
			.addButton((btn) => btn
				.setButtonText("Hidden Text")
				// .setCta()
				.onClick(() => {
          this.editor.replaceSelection(`<span class="hidden-text">${this.editor.getSelection()}</span>`);
					this.close();
				}));
		new Setting(contentEl)
			.addButton((btn) => btn
				.setButtonText("Red Highlight Text")
				// .setCta()
				.onClick(() => {
					this.editor.replaceSelection(`<span class="red-highlight-text">${this.editor.getSelection()}</span>`);
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
	settings: SETTINGS;

	constructor(app: App, editor: Editor, settings: SETTINGS) {
		super(app);
		this.editor = editor;
		this.settings = settings;
	}

	onOpen() {
		const {contentEl} = this;
		let selectionText = this.editor.getSelection();
		let wrapperTag = ''
		let wrapperClass = ''
		contentEl.createEl("h1", { text: "Write tag and class name" });
		if(this.settings.emmetFormat){
			new Setting(contentEl)
				.setName("tag.class")
				.addText((text) =>
					text.onChange((value) => {
						wrapperTag = value.split('.')[0]
						if(value.split('.').length >= 2) {
							let wrapperClassArray = value.split('.')
							wrapperClassArray.shift()
							wrapperClass = wrapperClassArray.join(' ')
						}
						selectionText = `<${wrapperTag} class="${this.settings.prefix}${wrapperClass}">${this.editor.getSelection()}</${wrapperTag}>`
					}));
		} else {
			new Setting(contentEl)
				.setName("tag")
				.addText((text) =>
					text.onChange((value) => {
						wrapperTag = value
						selectionText = `<${wrapperTag} class="${this.settings.prefix}${wrapperClass}">${this.editor.getSelection()}</${wrapperTag}>`
					}));
			
			new Setting(contentEl)
				.setName("class")
				.addText((text) =>
					text.onChange((value) => {
						wrapperClass = value
						selectionText = `<${wrapperTag} class="${this.settings.prefix}${wrapperClass}">${this.editor.getSelection()}</${wrapperTag}>`
					}));
		}

		new Setting(contentEl)
			.addButton((btn) => btn
				.setButtonText("Done")
				.setCta()
				.onClick(() => {
          this.editor.replaceSelection(selectionText);
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
	}
}
