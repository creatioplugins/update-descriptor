'use babel';

import UpdateDescriptorView from './update-descriptor-view';
import { CompositeDisposable } from 'atom';
import fs from 'fs';
import path from 'path';
const { promisify } = require('util')

export default {

  updateDescriptorView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
	this.updateDescriptorView = new UpdateDescriptorView(state.updateDescriptorViewState);
	this.modalPanel = atom.workspace.addModalPanel({
	  item: this.updateDescriptorView.getElement(),
	  visible: false
	});

	// Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
	this.subscriptions = new CompositeDisposable();

	this.subscriptions.add(
		atom.workspace.observeTextEditors((editor) => {
			let buffer = editor.getBuffer();
			if (!buffer.file.path.endsWith(".js") && !buffer.file.path.endsWith(".cs")) {
				return;
			}
			this.subscriptions.add(
				buffer.onDidSave(this.updateDescriptor.bind(this))
			);
		}.bind(this))
	);

	// Register command that toggles this view
	this.subscriptions.add(atom.commands.add('atom-workspace', {
	  'update-descriptor:updateDescriptor': () => this.updateDescriptor()
	}));
  },

  deactivate() {
	this.modalPanel.destroy();
	this.subscriptions.dispose();
	this.updateDescriptorView.destroy();
  },

  serialize() {
	return {
	  updateDescriptorViewState: this.updateDescriptorView.serialize()
	};
  },

  async updateDescriptor(document) {
	  if (!document || (!document.path.endsWith(".js") && !document.path.endsWith(".cs"))) {
		  console.log("Folder haven`t descriptor");
		  return;
	  }
	  try {
		  let filePath = this.getDescriptorFilePath(document.path);
		  let fileContent = await this.getDescriptorFileByPath(filePath);
		  if (fileContent) {
			  this.saveDescriptor(filePath, fileContent);
		  }
	  }
	  catch (e) {
		  console.log(e);
		  atom.notifications.addError("Error is occured while update descriptor", {
			  dismissable: true,
			  detail: e.toString()
		  });
	  }
  },

  getDescriptorFilePath(fileDirectory) {
	  return path.join(path.dirname(fileDirectory), "descriptor.json");
  },

  async getDescriptorFileByPath(filePath) {
	  var isExistsDescriptor = await this.getIsFileExistsAsync(filePath);
	  if (!isExistsDescriptor) {
		  console.log("File is not exists");
		  return;
	  }

	  let fileContent = await this.readFileAsync(filePath, "utf8");
	  if (!fileContent) {
		  console.log("File is not exists");
		  return;
	  }
	  return fileContent;
  },

  async saveDescriptor(filePath, fileContent) {
	  fileContent = this.getUpdatedDescriptorTime(fileContent);
	  await this.writeFileAsync(filePath, fileContent);

	  atom.notifications.addSuccess("Descriptor file is updated", {
		  detail: "Descriptor by path " + filePath + " is updated"
	  });
  },

  getUpdatedDescriptorTime(fileContent) {
	  let fileJSON = JSON.parse(fileContent.trim());
	  fileJSON.Descriptor.ModifiedOnUtc = `\\/Date(${new Date().getTime()})\\/`;

	  return JSON.stringify(fileJSON, null, "  ").replace(/\\\\/g, '\\');
  },

  getIsFileExistsAsync: promisify(fs.exists),

  readFileAsync: promisify(fs.readFile),

  writeFileAsync: promisify(fs.writeFile)
};
