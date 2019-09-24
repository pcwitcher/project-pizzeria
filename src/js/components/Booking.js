import { templates, select, settings, classNames } from '../settings.js';
import { utils } from '../utils.js';
import AmountWidget from './AmountWidget.js';
import DatePicker from './DatePicker.js';
import HourPicker from './HourPicker.js';

class Booking {
  constructor(bookingElem) {
    const thisBooking = this;
    thisBooking.starters = [];

    thisBooking.render(bookingElem);
    thisBooking.initWidgets();
    thisBooking.getData();
    thisBooking.initBooking();
    thisBooking.initActions();
  }

  render(bookingElem) {
    const thisBooking = this;

    const generatedHTML = templates.bookingWidget();

    thisBooking.dom = {};
    thisBooking.dom.wrapper = bookingElem;
    bookingElem.innerHTML = generatedHTML;

    thisBooking.dom.peopleAmount = thisBooking.dom.wrapper.querySelector(
      select.booking.peopleAmount
    );

    thisBooking.dom.hoursAmount = thisBooking.dom.wrapper.querySelector(
      select.booking.hoursAmount
    );

    thisBooking.dom.datePicker = thisBooking.dom.wrapper.querySelector(
      select.widgets.datePicker.wrapper
    );

    thisBooking.dom.hourPicker = thisBooking.dom.wrapper.querySelector(
      select.widgets.hourPicker.wrapper
    );

    thisBooking.dom.tables = thisBooking.dom.wrapper.querySelectorAll(
      select.booking.tables
    );

    thisBooking.dom.form = thisBooking.dom.wrapper.querySelector(
      select.booking.form
    );

    thisBooking.dom.phone = thisBooking.dom.wrapper.querySelector(
      select.booking.phone
    );

    thisBooking.dom.address = thisBooking.dom.wrapper.querySelector(
      select.booking.address
    );

    thisBooking.dom.starters = thisBooking.dom.wrapper.querySelectorAll(
      select.booking.starters
    );
    thisBooking.dom.availabilityRangeSlider = thisBooking.dom.wrapper.querySelector(
      select.booking.availabilityRangeSlider
    );
  }

  initWidgets() {
    const thisBooking = this;

    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);

    thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);
    thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);

    thisBooking.dom.datePicker.addEventListener('updated', function() {
      thisBooking.clearTableAvailability();
      thisBooking.updateDOM();
      thisBooking.initTableAvailability();
    });

    thisBooking.dom.hourPicker.addEventListener('updated', function() {
      thisBooking.updateDOM();
    });
  }

  getData() {
    const thisBooking = this;

    const startDayParam =
      settings.db.dateStartParamKey +
      '=' +
      utils.dateToStr(thisBooking.datePicker.minDate);

    const endDateParam =
      settings.db.dateEndParamKey +
      '=' +
      utils.dateToStr(thisBooking.datePicker.maxDate);

    const params = {
      booking: [startDayParam, endDateParam],
      eventsCurrent: [settings.db.notRepeatParam, startDayParam, endDateParam],
      eventsRepeat: [settings.db.repeatParam, endDateParam]
    };

    const urls = {
      booking:
        settings.db.url +
        '/' +
        settings.db.booking +
        '?' +
        params.booking.join('&'),
      eventsCurrent:
        settings.db.url +
        '/' +
        settings.db.event +
        '?' +
        params.eventsCurrent.join('&'),
      eventsRepeat:
        settings.db.url +
        '/' +
        settings.db.event +
        '?' +
        params.eventsRepeat.join('&')
    };

    Promise.all([
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat)
    ])
      .then(function(allResponses) {
        const bookingsResponse = allResponses[0];
        const eventsCurrentResponse = allResponses[1];
        const eventsRepeatResponse = allResponses[2];
        return Promise.all([
          bookingsResponse.json(),
          eventsCurrentResponse.json(),
          eventsRepeatResponse.json()
        ]);
      })
      .then(function([bookings, eventsCurrent, eventsRepeat]) {
        thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
      });
  }

  parseData(bookings, eventsCurrent, eventsRepeat) {
    const thisBooking = this;

    thisBooking.booked = {};

    for (let item of bookings) {
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }
    for (let item of eventsCurrent) {
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    const minDate = thisBooking.datePicker.minDate;
    const maxDate = thisBooking.datePicker.maxDate;

    for (let item of eventsRepeat) {
      if (item.repeat == 'daily') {
        for (
          let loopDate = minDate;
          loopDate <= maxDate;
          loopDate = utils.addDays(loopDate, 1)
        ) {
          thisBooking.makeBooked(
            utils.dateToStr(loopDate),
            item.hour,
            item.duration,
            item.table
          );
        }
      }
    }

    thisBooking.updateDOM();
    thisBooking.initTableAvailability();
  }

  makeBooked(date, hour, duration, table) {
    const thisBooking = this;

    if (typeof thisBooking.booked[date] == 'undefined') {
      thisBooking.booked[date] = {};
    }

    const startHour = utils.hourToNumber(hour);

    for (
      let hourBlock = startHour;
      hourBlock < startHour + duration;
      hourBlock += 0.5
    ) {
      if (typeof thisBooking.booked[date][hourBlock] == 'undefined') {
        thisBooking.booked[date][hourBlock] = [];
      }

      thisBooking.booked[date][hourBlock].push(table);
    }
  }

  updateDOM() {
    const thisBooking = this;

    thisBooking.date = thisBooking.datePicker.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPicker.value);

    let allAvailable = false;

    if (
      typeof thisBooking.booked[thisBooking.date] == 'undefined' ||
      typeof thisBooking.booked[thisBooking.date][thisBooking.hour] ==
        'undefined'
    ) {
      allAvailable = true;
    }

    for (let table of thisBooking.dom.tables) {
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);
      if (!isNaN(tableId)) {
        tableId = parseInt(tableId);
      }
      if (
        !allAvailable &&
        thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableId)
      ) {
        table.classList.add(classNames.booking.tableBooked);
      } else {
        table.classList.remove(classNames.booking.tableBooked);
      }
    }
  }

  initTableAvailability() {
    const thisBooking = this;

    const tableAvailability = [];

    for (let i = settings.hours.open; i < settings.hours.close; i += 0.5) {
      if (thisBooking.booked[thisBooking.date][i]) {
        thisBooking.booked[thisBooking.date][i].push[thisBooking.table];
      } else {
        thisBooking.booked[thisBooking.date][i] = [];
      }
      //console.log(thisBooking.booked[thisBooking.date][i]);
      tableAvailability.push(thisBooking.booked[thisBooking.date][i].length);
    }

    //console.log('availability', tableAvailability);

    for (let i = 0; i < tableAvailability.length; i++) {
      const divRangeSlider = document.createElement('div');
      divRangeSlider.classList.add(classNames.rangeSlider.div);

      if (tableAvailability[i] === 2) {
        divRangeSlider.classList.add(classNames.rangeSlider.oneTable);
      } else if (tableAvailability[i] === 3) {
        divRangeSlider.classList.add(classNames.rangeSlider.noTables);
      } else {
        divRangeSlider.classList.add(classNames.rangeSlider.allTables);
      }
      thisBooking.dom.availabilityRangeSlider.appendChild(divRangeSlider);
    }
  }

  clearTableAvailability() {
    document.getElementById(classNames.rangeSlider.divWrapper).innerHTML = '';
  }

  setDefaultValues() {
    const thisBooking = this;

    thisBooking.hour = thisBooking.defaultValues.hour;
    thisBooking.date = thisBooking.defaultValues.date;
    thisBooking.people = thisBooking.defaultValues.people;
    thisBooking.duration = thisBooking.defaultValues.duration;
  }

  initBooking() {
    const thisBooking = this;

    for (let table of thisBooking.dom.tables) {
      table.addEventListener('click', function(event) {
        event.preventDefault();

        if (!table.classList.contains(classNames.booking.tableBooked)) {
          table.classList.toggle(classNames.booking.tableReservation);
          thisBooking.reservedTable = parseInt(
            table.getAttribute(settings.booking.tableIdAttribute)
          );
        }

        const allReservedTables = document.querySelectorAll(
          select.booking.tablesReserved
        );

        for (let reservedTable of allReservedTables) {
          if (reservedTable !== table) {
            reservedTable.classList.remove(classNames.booking.tableReservation);
          }
        }
      });

      thisBooking.dom.hourPicker.addEventListener('updated', function() {
        table.classList.remove(classNames.booking.tableReservation);
      });

      thisBooking.dom.datePicker.addEventListener('change', function() {
        table.classList.remove(classNames.booking.tableReservation);
      });
    }

    thisBooking.starters = [];

    for (let starter of thisBooking.dom.starters) {
      starter.addEventListener('change', function() {
        if (this.checked) {
          thisBooking.starters.push(starter.value);
        } else {
          thisBooking.starters.splice(
            thisBooking.starters.indexOf(starter.value, 1)
          );
        }
      });
    }
  }

  sendBooking() {
    const thisBooking = this;
    const url = settings.db.url + '/' + settings.db.booking;

    const payload = {
      date: thisBooking.datePicker.dom.input.value,
      hour: thisBooking.hourPicker.value,
      table: thisBooking.reservedTable,
      repeat: false,
      duration: thisBooking.hoursAmount.value,
      ppl: thisBooking.peopleAmount.value,
      phone: thisBooking.dom.phone.value,
      address: thisBooking.dom.address.value,
      starters: thisBooking.starters
    };

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    };

    fetch(url, options)
      .then(function(response) {
        return response.json();
      })
      .then(function(parsedResponse) {
        console.log('parsedResponse', parsedResponse);
        thisBooking.reservedTable = undefined;
        thisBooking.getData();
      });
  }

  refreshTable() {
    const thisBooking = this;

    for (let table of thisBooking.dom.tables) {
      table.classList.remove(classNames.booking.tableReservation);
    }
  }

  initActions() {
    const thisBooking = this;

    thisBooking.dom.form.addEventListener('submit', function(event) {
      event.preventDefault();

      thisBooking.sendBooking();
      thisBooking.refreshTable();
      thisBooking.dom.form.reset();
    });
  }
}

export default Booking;
