import { Component } from 'react';
import { serializeToJSObject } from '../Utils/Serializer';
import { rgbToHexNumber } from '../Utils/ColorTransformer';

export default class BaseEditor extends Component {
  getProject() {
    return this.props.project;
  }

  getLabel() {
    //TODO
    return 'Unknown editor';
  }

  componentDidMount() {
    this.updateToolbar();
  }

  updateToolbar() {
    console.warn('No toolbar defined for this editor');

    if (this.props.setToolbar) this.props.setToolbar(null);
  }

  getSerializedElements() {
    throw new Error(
      'The editor has not implemented getSerializedElements to return what should be serialized'
    );
  }

  static getLayoutSerializedElements(layout) {
    if (!layout) return {};

    return {
      windowTitle: layout.getWindowDefaultTitle(),
      layers: serializeToJSObject(layout, 'serializeLayersTo'),
      backgroundColor: '' +
        rgbToHexNumber(
          layout.getBackgroundColorRed(),
          layout.getBackgroundColorGreen(),
          layout.getBackgroundColorBlue()
        ),
    };
  };
}
