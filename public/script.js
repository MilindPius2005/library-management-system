// public/js/main.js

// Show notification on page
function showNotification(message, type = 'success') {
    const notif = document.createElement('div');
    notif.className = `alert alert-${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);
  
    setTimeout(() => {
      notif.remove();
    }, 3000);
  }
  
  // Confirm deletion (for admin UI)
  function confirmDeletion(callback) {
    if (confirm("Are you sure you want to delete this item?")) {
      callback();
    }
  }
  