// Global functions
window.moveCarousel = function(direction) {
  if (!window.carousel || typeof window.currentPage === 'undefined') return;
  window.currentPage += direction;
  const totalItems = window.carousel.children.length;
  const totalPages = Math.ceil(totalItems / window.itemsPerPage);
  if (window.currentPage < 0) window.currentPage = 0;
  if (window.currentPage >= totalPages) window.currentPage = totalPages - 1;
  window.carousel.style.transform = `translateX(-${window.currentPage * (100 / window.itemsPerPage)}%)`;
  document.querySelector('.prev').disabled = window.currentPage === 0;
  document.querySelector('.next').disabled = window.currentPage === totalPages - 1;
};

window.closeSeatModal = function() {
  if (window.seatModal) window.seatModal.style.display = 'none';
};

document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  const seatGrid = document.getElementById('seatGrid');
  const confirmBtn = document.getElementById('confirmBtn');
  const resetBtn = document.getElementById('resetBtn');
  const toggle3D = document.getElementById('toggle3D');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const selectedSeatsDisplay = document.getElementById('selectedSeats');
  const totalCostDisplay = document.getElementById('totalCost');
  window.seatModal = document.getElementById('seatModal');
  const confirmSeatCount = document.getElementById('confirmSeatCount');
  const seatLimitElement = document.getElementById('seatLimit');
  window.carousel = document.getElementById('carousel');
  const rows = 8;
  const cols = 14;
  const rowLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  let selectedSeats = [];
  const regularPrice = 200;
  const vipPrice = 300;
  let is3D = false;
  let seatLimit = 0;
  let totalCost = 0;
  let zoomLevel = 1;
  let panX = 0;

  if (!seatGrid || !confirmBtn || !resetBtn || !toggle3D || !loadingSpinner || !selectedSeatsDisplay || 
      !totalCostDisplay || !window.seatModal || !confirmSeatCount || !seatLimitElement || !window.carousel) {
    console.error('Required elements missing. Check your HTML and server setup.');
    return;
  }

  loadingSpinner.style.display = 'block';

  // Generate seat grid
  for (let r = 0; r < rows; r++) {
    const rowLabel = document.createElement('div');
    rowLabel.classList.add('row-label');
    rowLabel.textContent = rowLabels[r];
    seatGrid.appendChild(rowLabel);
    for (let c = 0; c < cols; c++) {
      if (c === 7) {
        const partition = document.createElement('div');
        partition.classList.add('partition');
        seatGrid.appendChild(partition);
        continue;
      }
      const seat = document.createElement('div');
      seat.classList.add('seat', 'available');
      if (r >= rows - 2) seat.classList.add('vip');
      const seatId = `${rowLabels[r]}${c < 7 ? c + 1 : c + 2}`;
      seat.dataset.id = seatId;
      seat.dataset.price = (r >= rows - 2) ? vipPrice : regularPrice;
      seat.textContent = seatId;
      seat.addEventListener('click', () => {
        if (seat.classList.contains('booked') || (seatLimit > 0 && selectedSeats.length >= seatLimit)) return;
        seat.classList.toggle('selected');
        if (selectedSeats.includes(seatId)) {
          selectedSeats = selectedSeats.filter(s => s !== seatId);
          totalCost -= parseInt(seat.dataset.price);
        } else {
          selectedSeats.push(seatId);
          totalCost += parseInt(seat.dataset.price);
        }
        updateDisplay();
      });
      seat.addEventListener('mouseover', () => {
        if (!seat.classList.contains('booked')) seat.setAttribute('data-tooltip', `₹${seat.dataset.price}`);
      });
      seat.addEventListener('mouseout', () => seat.removeAttribute('data-tooltip'));
      seatGrid.appendChild(seat);
    }
  }

  loadingSpinner.style.display = 'none';

  // Toggle 3D Theater View with CSS transform
  function update3DView() {
    if (is3D) {
      seatGrid.style.transform = `perspective(1200px) rotateX(70deg) rotateY(0deg) scale(${zoomLevel}) translateX(${panX}%) translateZ(0)`;
      seatGrid.style.transition = 'transform 0.5s ease';
    } else {
      seatGrid.style.transform = 'none';
      seatGrid.style.transition = 'transform 0.5s ease';
    }
  }

  
  toggle3D.addEventListener('click', () => {
    is3D = !is3D;
    toggle3D.textContent = is3D ? '2D View' : 'Toggle 3D Theater View';
    if (is3D) {
      zoomLevel = 1.5; // Zoom to VIP seats
      panX = 0;
      update3DView();
    } else {
      zoomLevel = 1;
      panX = 0;
      update3DView();
    }
  });

  // Arrow key navigation (only for 3D movement)
  document.addEventListener('keydown', (e) => {
    if (is3D) {
      e.preventDefault(); // Prevent page scrolling
      const step = 0.05;
      const panStep = 5;
      switch (e.key) {
        case 'ArrowUp':
          zoomLevel += step;
          if (zoomLevel > 2) zoomLevel = 2; // Max zoom
          break;
        case 'ArrowDown':
          zoomLevel -= step;
          if (zoomLevel < 1) zoomLevel = 1; // Min zoom
          break;
        case 'ArrowLeft':
          panX -= panStep;
          if (panX < -50) panX = -50; // Limit left
          break;
        case 'ArrowRight':
          panX += panStep;
          if (panX > 50) panX = 50; // Limit right
          break;
      }
      update3DView();
    }
  });

  // Reset selection
  resetBtn.addEventListener('click', () => {
    selectedSeats.forEach(id => {
      const seat = document.querySelector(`[data-id='${id}']`);
      if (seat) seat.classList.remove('selected');
    });
    selectedSeats = [];
    totalCost = 0;
    updateDisplay();
  });

  // Confirm booking
  confirmBtn.addEventListener('click', () => {
    if (selectedSeats.length === 0) {
      alert('Please select at least one seat!');
      return;
    }
    if (seatLimit > 0 && selectedSeats.length > seatLimit) {
      alert(`You can only book up to ${seatLimit} seats. Please adjust your selection.`);
      return;
    }
    loadingSpinner.style.display = 'block';
    fetch('/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ showId: window.showId, seats: selectedSeats })
    })
      .then(res => res.json())
      .then(data => {
        loadingSpinner.style.display = 'none';
        if (data.success) {
          socket.emit('bookSeats', selectedSeats);
          selectedSeats = [];
          totalCost = 0;
          updateDisplay();
          alert('Booking successful!');
          window.location.href = '/movies';
        } else {
          alert('Booking failed: ' + data.error);
        }
      })
      .catch(err => {
        console.error('Booking error:', err);
        loadingSpinner.style.display = 'none';
        alert('Error booking seats. Please try again.');
      });
  });

  // Update booked seats in real-time
  socket.on('seatsBooked', bookedSeats => {
    bookedSeats.forEach(id => {
      const seat = document.querySelector(`[data-id='${id}']`);
      if (seat) {
        seat.classList.remove('selected', 'available', 'vip');
        seat.classList.add('booked');
      }
    });
    selectedSeats = selectedSeats.filter(id => !bookedSeats.includes(id));
    totalCost = selectedSeats.reduce((sum, id) => sum + parseInt(document.querySelector(`[data-id='${id}']`).dataset.price), 0);
    updateDisplay();
  });

  // Modal and Carousel Logic
  window.itemsPerPage = 5;
  window.currentPage = 0;
  function initCarousel() {
    if (!window.carousel) return;
    window.carousel.innerHTML = '';
    for (let i = 1; i <= 15; i++) {
      const item = document.createElement('div');
      item.classList.add('carousel-item');
      item.textContent = i;
      item.addEventListener('click', () => {
        document.querySelectorAll('.carousel-item').forEach(item => item.classList.remove('selected'));
        item.classList.add('selected');
        seatLimit = i;
        confirmSeatCount.disabled = false;
        seatLimitElement.querySelector('span').textContent = seatLimit;
        seatLimitElement.style.display = 'block';
      });
      window.carousel.appendChild(item);
    }
    window.moveCarousel(0);
  }

  function updateDisplay() {
    selectedSeatsDisplay.textContent = selectedSeats.length;
    totalCostDisplay.textContent = totalCost.toFixed(0);
    confirmBtn.disabled = selectedSeats.length === 0;
  }

  function openSeatModal() {
    if (window.seatModal) {
      window.seatModal.style.display = 'block';
      initCarousel();
      confirmSeatCount.disabled = true;
    }
  }

  confirmSeatCount.addEventListener('click', () => {
    if (seatLimit > 0) {
      closeSeatModal();
    }
  });

  if (selectedSeats.length === 0) openSeatModal();
});