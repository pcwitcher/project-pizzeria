import {
  select,
  settings
} from '../settings.js';

class AmountWidget {
  constructor(element) {
    const thisWidget = this;

    thisWidget.getElements(element);
    thisWidget.initActions();
    thisWidget.setValue(thisWidget.input.value);

    //console.log('AmountWidget:', thisWidget);
    //console.log('constructor arguments:', element);
  }

  getElements(element) {
    const thisWidget = this;

    thisWidget.element = element;
    thisWidget.input = thisWidget.element.querySelector(select.widgets.amount.input);
    thisWidget.linkDecrease = thisWidget.element.querySelector(select.widgets.amount.linkDecrease);
    thisWidget.linkIncrease = thisWidget.element.querySelector(select.widgets.amount.linkIncrease);
    thisWidget.value = settings.amountWidget.defaultValue;
  }

  setValue(value) {
    const thisWidget = this;
    const newValue = parseInt(value);

    /* TODO: add validation */

    if (settings.amountWidget.defaultMin <= newValue && newValue <= settings.amountWidget.defaultMax && newValue != thisWidget.value) {
      thisWidget.value = newValue;
      thisWidget.announce();
    }
    thisWidget.input.value = thisWidget.value;
  }

  initActions() {
    const thisWidget = this;

    thisWidget.input.addEventListener('change', function () {
      thisWidget.setValue(thisWidget.input.value);
      //console.log(thisWidget);
    });

    thisWidget.linkDecrease.addEventListener('click', function (event) {
      event.preventDefault();
      thisWidget.setValue(thisWidget.value - 1);
    });

    thisWidget.linkIncrease.addEventListener('click', function (event) {
      event.preventDefault();
      thisWidget.setValue(thisWidget.value + 1);
    });
  }
  announce() {
    const thisWidget = this;

    const event = new CustomEvent('updated', {
      bubbles: true
    });
    thisWidget.element.dispatchEvent(event);
    //console.log(event);
  }
}

export default AmountWidget;
