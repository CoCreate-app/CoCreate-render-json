/*global CustomEvent, localStorage*/
import observer from '@cocreate/observer';
import crud from '@cocreate/crud-client';

const CoCreateRenderJson = {
	mainInfo: {},
	
	init: function() {
		const self = this;
		crud.listen('updateDocument', function(data) {
			self.render(data)
		})
		
		crud.listen('readDocument', function(data) {
			self.render(data)
		})
		
		crud.listen('connect', function(data) {
			// self.getRequest()
			self.__getRequest()
		})
	},

	initElement: function(container) {
		const requests = this.__getRequest(container)

		if (requests) {
			
			requests.forEach((req) => {
				crud.readDocument({
					collection: req['collection'],
					document_id: req['document_id']
				})
			})
		}
	},

	render: function(data) {
		const collection = data['collection'];
		const document_id = data['document_id'];
		
		for (let name in data.data) {
			const key = this.__makeKey(collection, document_id, name) 
			const value = data.data[name];
			if (this.mainInfo[key]) {
				this.mainInfo[key].forEach((item) => {
					let attr_value = item.el.getAttribute(item.attr)
					if (attr_value) {
						let json_str = this.__findJSONSection(attr_value)
						if (json_str) {
							attr_value = attr_value.replace(json_str, value);
						}
					}
					let option = item.el.getAttribute('fetch-for');
					if (option == 'lowercase')
						item.el.setAttribute(item.attr, attr_value.toLowerCase());
					else
						item.el.setAttribute(item.attr, attr_value);
					
					// if (item.attr == 'collection') {
					// 	runInitModule('cocreate-text');						
					// } 
					
					item.el.dispatchEvent(new CustomEvent('CoCreateAttribute-run', {
						eventType: 'rendered',
						item: item.el
					}))
				})
			}
		}
	},
	
	setValue: function(element, data) {
		
	},
	
	__getRequest: function(container) {
		let fetch_container = container || document;
		let elements = fetch_container.querySelectorAll('[fetch-for]');
		let self = this;

		let requestData = [];
		
		if (elements.length === 0 && fetch_container != document && fetch_container.hasAttributes('fetch-for')) {
			elements = [fetch_container];
		}

		elements.forEach((el) => {
			//. check
			if (el.closest('.template')) return;
			const el_collection = el.getAttribute('collection')
			const el_documentId = el.getAttribute('document_id')
			const el_name = el.getAttribute('name')
			const el_value = el.getAttribute('value')
			
			const attributes = el.attributes;
			
			for (let i = 0; i < attributes.length; i++) {
				let jsonInfo = self.__jsonParse(attributes[i].value);
				if (jsonInfo) {
					let collection = jsonInfo['collection'] || el_collection;
					let document_id = jsonInfo['document_id'] || el_documentId;
					let name = jsonInfo['name'] || el_name;
					let value = jsonInfo['value'] || el_value;
					
					if (jsonInfo['pass_id']) {
						let pass_info = self.__checkPassId(jsonInfo['pass_id']);
						if (pass_info) {
							collection = pass_info.collection;
							document_id = pass_info.document_id;
							value = pass_info.value;
						} else {
							collection = null;
							document_id = null;
							value = null;
						}
					}

					const key = self.__makeKey(collection, document_id, name);
					
					if (collection && document_id && name) {
						if (!self.mainInfo[key]) {
							self.mainInfo[key] = [];
						}
						self.mainInfo[key].push({el: el, attr: attributes[i].name})
						
						if (!requestData.some((d) => d['collection'] === collection && d['document_id'] === document_id)) {
							requestData.push({collection, document_id})
						}
					}
				}
			}
		})
		return requestData;
	},
	
	// ToDo duplicate.. exist in Utils and utils.crud
	__jsonParse: function(str_data) {
		try {
			let json_data = JSON.parse(this.__findJSONSection(str_data));
			if (typeof json_data === 'object' && json_data != null) {
				return json_data;
			} else {
				return null;
			}
		} catch (e) {
			return null;
		}
	},
	
	__findJSONSection: function(str_data) {
		try {
			let match_data = str_data.match(/({[A-Za-z0-9_.,\[\]\-"": ]*})/g);
			if (match_data) {
				return match_data[0];
			}
		} catch (e) {
			return null;
		} 
	},
	
	__checkPassId: function(pass_id) {
		var dataParams = localStorage.getItem('dataParams');
		dataParams = JSON.parse(dataParams);

		if (!dataParams || dataParams.length == 0) return null;

		for (var i = 0; i < dataParams.length; i++) {
			if (dataParams[i].pass_to == pass_id) {
				return {
					collection: dataParams[i].collection, 
					document_id: dataParams[i].document_id,
					value: dataParams[i].value
				};
			}
		}
		return null;
	},
	
	__makeKey: function (collection, document_id, name) {
		return `${collection}_${document_id}_${name}`;
	}, 
};


CoCreateRenderJson.init();
CoCreateRenderJson.initElement();

observer.init({
	name: 'CoCreateAttributes',
	observe: ['addedNodes'],
	target: '[fetch-for]',
	callback: function(mutation) {
		CoCreateRenderJson.initElement(mutation.target);
	}
});

export default CoCreateRenderJson;
