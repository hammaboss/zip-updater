function copy() {var class_a = document.getElementById('copy');
class_a.select();
class_a.setSelectionRange(0, 1000);
document.execCommand('copy');
}
