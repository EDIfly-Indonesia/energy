<style>
  .right {
    text-align: right;
  }
</style>

<div class="msg" style="display:none;">
  <?php echo @$this->session->flashdata('msg'); ?>
</div>

<div class="box">
  <div class="box-body">
    <?php if($access->c) { ?>
    <div class="btn-group right">
      <a href="javascript:void(0);" class="btn btn-primary" onclick="tambahdata();">Tambah</a>
    </div><br><br>
    <?php } ?>

    <div class="table-responsive" style="min-height: 500px;">
      <table id="list-data" class="table table-bordered table-striped">
        <thead>
          <tr>
            <th class="text-center">ChargeBox ID</th>
            <th class="text-center">Nama Chargebox</th>
            <th class="text-center">Last Ping</th>
            <th class="text-center">Mitra</th>
            <th class="text-center">Area</th>
            <th class="text-center">Alamat</th>
            <th class="text-center">Jml.Konektor</th>
            <th>Aksi</th>
            <th></th>
          </tr>
        </thead>
      </table>
    </div>
  </div>
</div>

<!-- Modal Tambah -->
<div class="modal fade" id="modaltambah" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header bg-primary">
        <h3 class="modal-title text-white">Tambah Data ChargeBox</h3>
        <button class="close" type="button" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true" class="text-white">&times;</span>
        </button>
      </div>
      <div class="modal-body">
        <form id="formChargebox">
          <div class="form-group">
            <label for="select_id_area">Pilih Area</label>
            <select name="id_area" class="form-control" id="select_id_area">
              <option value="">-- Pilih Area --</option>
            </select>
          </div>
          <div class="form-group">
            <label for="add_chargebox_id">ChargeBox ID</label>
            <input type="text" name="chargebox_id" class="form-control" id="add_chargebox_id">
          </div>
          <div class="form-group">
            <label for="add_nama_chargebox">Nama ChargeBox</label>
            <input type="text" name="nama_chargebox" class="form-control" id="add_nama_chargebox">
          </div>
          <div class="form-group">
            <label for="input_fasilitas">Fasilitas</label>
            <input type="text" id="input_fasilitas" class="form-control mb-2" placeholder="Masukkan fasilitas baru">
            <input type="file" id="input_icon" class="form-control mb-2" accept="image/*">
            <button class="btn btn-primary mb-2" type="button" onclick="tambahFasilitas()">Tambah</button>
            <select id="add_fasilitas" class="form-control mt-2" multiple disabled></select>
            <input type="hidden" name="fasilitas" id="add_fasilitas_hidden">
          </div>
          <div class="form-group">
            <label for="add_foto">Foto & Judul</label>
            <input type="text" id="input_judul_foto" class="form-control mb-2" placeholder="Masukkan judul foto">
            <input type="file" id="add_foto" class="form-control mb-2" accept="image/*" multiple>
            <button type="button" class="btn btn-primary mb-2" onclick="tambahFotoJudul()">Tambah</button>
            <select id="add_foto_select" class="form-control mt-2" multiple disabled></select>
            <input type="hidden" name="foto_judul" id="add_foto_hidden">
          </div>
          <div class="form-group">
            <label for="add_id_mitra">Mitra</label>
            <select name="id_mitra" class="form-control" id="add_id_mitra">
              <option value="">-- Pilih Mitra --</option>
            </select>
          </div>
          <div class="form-group">
            <label for="add_vendor">Vendor</label>
            <input type="text" name="vendor" class="form-control" id="add_vendor">
          </div>
          <div class="form-group">
            <label for="add_model">Model</label>
            <input type="text" name="model" class="form-control" id="add_model">
          </div>
          <div class="form-group">
            <label for="add_serial_number">Serial Number</label>
            <input type="text" name="serial_number" class="form-control" id="add_serial_number">
          </div>
          <div class="form-group">
            <label for="add_ocpp_protocol">OCPP Protocol</label>
            <select name="ocpp_protocol" class="form-control" id="add_ocpp_protocol">
              <option value="non_ocpp">Non-OCPP</option>
              <option value="ocpp1.6J">OCPP 1.6J</option>
              <option value="ocpp2.0">OCPP 2.0</option>
              <option value="ocpp2.0.1">OCPP 2.0.1</option>
            </select>
          </div>
          <div class="form-group">
            <label for="add_jenis">Jenis</label>
            <select name="jenis" class="form-control" id="add_jenis">
              <option value="car">Car</option>
              <option value="bike">Bike</option>
            </select>
          </div>
          <div class="form-group">
            <label for="add_lat">Latitude</label>
            <input type="text" name="lat" class="form-control" id="add_lat">
          </div>
          <div class="form-group">
            <label for="add_lng">Longitude</label>
            <input type="text" name="lng" class="form-control" id="add_lng">
          </div>
          <div class="form-group">
            <label for="add_is_ppn">Is PPN</label>
            <input type="checkbox" name="is_ppn" id="add_is_ppn">
          </div>
          <div class="form-group">
            <label for="add_is_public">Is Public</label>
            <input type="checkbox" name="is_public" id="add_is_public">
          </div>
          <div class="form-group">
            <label for="add_is_active">Is Active</label>
            <input type="checkbox" name="is_active" id="add_is_active">
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" type="button" data-dismiss="modal">Batal</button>
        <button class="btn btn-primary" id="btn_add" onclick="simpandata();">Simpan</button>
      </div>
    </div>
  </div>
</div>

<!-- Tempat Modal Ubah -->
<div id="tempat-modal"></div>
<div class="modal fade" id="modalubah" tabindex="-1" role="dialog" aria-hidden="true">
  <div class="modal-dialog modal-dialog-scrollable modal-lg w-100" role="document" style="max-width: 95vw;">
    <div class="modal-content">
      <div class="modal-header bg-primary">
        <h5 class="modal-title text-white">Ubah Data Chargebox</h5>
        <button type="button" class="close text-white" data-dismiss="modal" aria-label="Close">
          <span>&times;</span>
        </button>
      </div>
      <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
        <form id="form_ubah">
          <!-- Seluruh form update diisi via JS -->
<!-- Modal untuk Edit Chargebox -->

  <div class="modal-dialog modal-dialog-scrollable modal-lg w-100" role="document" style="max-width: 95vw;">
    <div class="modal-content">
      

      <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
        <form id="form_ubah">
          <input type="hidden" name="id_chargebox" id="id_chargebox">

          <div class="form-group">
            <label for="chargebox_id">Chargebox ID</label>
            <input type="text" class="form-control" id="chargebox_id" name="chargebox_id">
          </div>

          <div class="form-group">
            <label for="nama_chargebox">Nama Chargebox</label>
            <input type="text" class="form-control" id="nama_chargebox" name="nama_chargebox">
          </div>

          <div class="form-group">
            <label for="id_mitra">Mitra</label>
            <select name="id_mitra" id="id_mitra" class="form-control">
              <?php foreach($daftarmitra as $u): ?>
                <option value="<?= $u->id ?>"><?= $u->name ?></option>
              <?php endforeach; ?>
            </select>
          </div>

          <div class="form-group">
            <label for="id_area">Area</label>
            <select name="id_area" id="id_area" class="form-control">
              <?php foreach($daftararea as $a): ?>
              <option value="<?= $a->id_area ?>"><?= $a->nama_area ?></option>
              <?php endforeach; ?>
            </select>
          </div>

          <div class="form-group">
            <label for="vendor">Vendor</label>
            <input type="text" class="form-control" id="vendor" name="vendor">
          </div>

          <div class="form-group">
            <label for="model">Model</label>
            <input type="text" class="form-control" id="model" name="model">
          </div>

          <div class="form-group">
            <label for="serial_number">Serial Number</label>
            <input type="text" class="form-control" id="serial_number" name="serial_number">
          </div>

          <div class="form-group">
            <label for="ocpp_protocol">OCPP Protocol</label>
            <input type="text" class="form-control" id="ocpp_protocol" name="ocpp_protocol">
          </div>

          <div class="form-group">
            <label for="jenis">Jenis</label>
            <select class="form-control" id="jenis" name="jenis">
              <option value="">-- Pilih Jenis --</option>
              <option value="car">Car</option>
              <option value="bike">Bike</option>
            </select>
          </div>

          <div class="form-group">
            <label for="lat">Latitude</label>
            <input type="text" class="form-control" id="lat" name="lat">
          </div>

          <div class="form-group">
            <label for="lng">Longitude</label>
            <input type="text" class="form-control" id="lng" name="lng">
          </div>

          <div class="form-group">
            <label for="is_ppn">Pakai PPN?</label>
            <select name="is_ppn" id="is_ppn" class="form-control">
              <option value="1">Ya</option>
              <option value="0">Tidak</option>
            </select>
          </div>

          <div class="form-group">
            <label for="is_public">Publik?</label>
            <select name="is_public" id="is_public" class="form-control">
              <option value="1">Ya</option>
              <option value="0">Tidak</option>
            </select>
          </div>

          <div class="form-group">
            <label for="is_active">Aktif?</label>
            <select name="is_active" id="is_active" class="form-control">
              <option value="1">Ya</option>
              <option value="0">Tidak</option>
            </select>
          </div>

         <!-- Input fasilitas + icon -->
          <div class="form-group">
            <label for="input_fasilitas_ubah">Fasilitas</label>
            <input type="text" id="input_fasilitas_ubah" class="form-control mb-2" placeholder="Masukkan nama fasilitas">
            <input type="file" id="input_icon_ubah" class="form-control mb-2" accept="image/*">
            <button type="button" class="btn btn-primary mb-2" onclick="tambahFasilitasUbah()">Tambah Fasilitas</button>

            <!-- Optional Preview List -->
            <select id="select_fasilitas_ubah" class="form-control mb-2" multiple disabled></select>
            <input type="hidden" name="fasilitas" id="hidden_fasilitas_ubah">
          </div>

          <!-- Area untuk menampilkan fasilitas yang sudah ada -->
          <div class="form-group" id="fasilitas">
            <!-- Akan dirender lewat renderFasilitasField() -->
          </div>


          <!-- Input foto + judul -->
          <div class="form-group">
          <label for="input_judul_foto_ubah">Foto & Judul</label>
          <input type="text" id="input_judul_foto_ubah" class="form-control mb-2" placeholder="Masukkan judul foto">
          <input type="file" id="input_file_foto_ubah" class="form-control mb-2" accept="image/*">
          <button type="button" class="btn btn-primary mb-2" onclick="tambahFotoJudulUbah()">Tambah Foto</button>

          <!-- Optional Preview List -->
          <select id="select_foto_ubah" class="form-control mb-2" multiple disabled></select>
          <input type="hidden" name="foto_judul" id="hidden_foto_ubah">
        </div>

        <!-- Area untuk menampilkan daftar foto -->
        <div class="form-group" id="foto">
          <!-- Akan dirender lewat renderFotoPreview() -->
        </div>



        </form>
      </div>
    
  </div>
</div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" type="button" data-dismiss="modal">Batal</button>
        <button class="btn btn-primary" id="btn_add" onclick="simpanubah();">Simpan</button>
      </div>
    </div>
  </div>

<div id="tempat-modal"></div>


<script type="text/javascript">
var _idubah = 0;
var dataFasilitasUbah = [];
var dataFotoUbah = [];
 const baseFasilitasUrl = "<?= $this->config->item('app_url') . $this->config->item('upload_fasilitas_path'); ?>";
  const baseChargeboxUrl = "<?= $this->config->item('app_url') . $this->config->item('upload_chargebox_path'); ?>";
    const BASE_URL = "<?= config_item('app_url'); ?>"; // untuk AJAX (POST ke hosting)
$(document).on('click', '.btn-ubah', function() {
    var id = $(this).data('id');
    ubah(id);
});

var _idalamat=0;
var tenantlama=null;
    $(document).ready(function() {
     
		getdata();

$(document).ready(function () {
  $('#select_id_area').select2({
    ajax: {
      url: '<?= base_url("chargebox/get_area") ?>',
      dataType: 'json',
      delay: 250,
      processResults: function (data) {
        console.log("Data Area Loaded:", data);
        return {
          results: data
        };
      }
    },
    placeholder: 'Pilih Area',
    minimumInputLength: 0,
    templateResult: function (data) {
      return data.text;
    },
    templateSelection: function (data) {
      if (data.nama_area !== undefined) {
        $('#input_area_text').val(data.nama_area);
      } else {
        $('#input_area_text').val(data.text);
      }
      return data.text;
    }
  });

  $('#add_id_mitra').select2({
    ajax: {
      url: '<?= base_url("chargebox/get_mitra") ?>',
      dataType: 'json',
      delay: 250,
      processResults: function (data) {
        console.log("Data Mitra Loaded:", data);
        return {
          results: data
        };
      }
    },
    placeholder: 'Pilih Mitra',
    minimumInputLength: 0
  });
});


	});

    const iconMap = {
        "wifi": "wifi.png",
        "toilet": "toilet.png",
        "resto": "resto.png",
        "mushola": "mushola.png"
        // tambahkan lagi kalau perlu
    };

    let fasilitasList = [];

function tambahFasilitas() {
    const namaFasilitas = document.getElementById('input_fasilitas').value.trim();
    const iconInput = document.getElementById('input_icon');
    const iconFile = iconInput.files[0];

    if (!namaFasilitas || !iconFile) {
        alert('Fasilitas dan ikon harus diisi.');
        return;
    }

    // Buat objek fasilitas sesuai format yang diminta
    const fasilitasObj = {
        icon: iconFile.name,  // Nama file ikon
        fasilitas: namaFasilitas // Nama fasilitas
    };

    // Tambahkan ke array
    fasilitasList.push(fasilitasObj);

    // Update tampilan <select> untuk list fasilitas
    const selectElement = document.getElementById('add_fasilitas');
    const option = document.createElement('option');
    option.text = `${namaFasilitas} (${iconFile.name})`;
    selectElement.add(option);

    // Update hidden input dengan data JSON
    document.getElementById('add_fasilitas_hidden').value = JSON.stringify(fasilitasList);
    console.log(fasilitasList);
    // Reset input setelah ditambahkan
    document.getElementById('input_fasilitas').value = '';
    iconInput.value = '';
}

  function aturppn(){
   _isppn= $('#txtpakaippn').val();
 
    if(_isppn=="1") {
      document.getElementById("boxppn").style.visibility = "visible";
    } else   document.getElementById("boxppn").style.visibility = "hidden";
    //alert("tes");
  }

  let dataFotoJudul = [];

function tambahFotoJudul() {
    const judul = document.getElementById('input_judul_foto').value.trim();
    const fileInput = document.getElementById('add_foto');
    const files = fileInput.files;

    if (!judul || files.length === 0) {
        alert('Judul dan file harus diisi!');
        return;
    }

    // Tambahkan setiap file yang dipilih ke array
    Array.from(files).forEach(file => {
        dataFotoJudul.push({
            judul: judul,
            foto: file.name,
            file: file
        });
    });

    // Kosongkan input setelah ditambahkan
    document.getElementById('input_judul_foto').value = '';
    fileInput.value = '';

    renderListFotoJudul();
    document.getElementById('add_foto_hidden').value = JSON.stringify(
        dataFotoJudul.map(item => ({
            judul: item.judul,
            foto: item.foto
        }))
    );
}

function renderListFotoJudul() {
    const select = document.getElementById('add_foto_select');
    select.innerHTML = '';
    dataFotoJudul.forEach(item => {
        const option = document.createElement('option');
        option.text = `${item.judul} (${item.foto})`;
        select.appendChild(option);
    });
}

function simpandata() {
    const id_area = $('#select_id_area').val();
    const chargebox_id = $('#add_chargebox_id').val();
    const nama_chargebox = $('#add_nama_chargebox').val();
    const id_mitra = $('#add_id_mitra').val();
    const vendor = $('#add_vendor').val();
    const model = $('#add_model').val();
    const serial_number = $('#add_serial_number').val();
    const ocpp_protocol = $('#add_ocpp_protocol').val();
    const jenis = $('#add_jenis').val();
    const lat = $('#add_lat').val();
    const lng = $('#add_lng').val();
    const is_ppn = $('#add_is_ppn').is(':checked') ? 1 : 0;
    const is_public = $('#add_is_public').is(':checked') ? 1 : 0;
    const is_active = $('#add_is_active').is(':checked') ? 1 : 0;
    const fasilitas = $('#add_fasilitas_hidden').val();

    if (!chargebox_id || !nama_chargebox || !id_mitra || !id_area) {
        alert("Field wajib (ChargeBox ID, Nama, Mitra, Area) harus diisi!");
        return;
    }

    if (dataFotoJudul.length === 0) {
        alert("Foto dan Judul harus diisi!");
        return;
    }

    const formData = new FormData();
    formData.append('chargebox_id', chargebox_id);
    formData.append('nama_chargebox', nama_chargebox);
    formData.append('id_mitra', id_mitra);
    formData.append('id_area', id_area);
    formData.append('vendor', vendor);
    formData.append('model', model);
    formData.append('serial_number', serial_number);
    formData.append('ocpp_protocol', ocpp_protocol);
    formData.append('jenis', jenis);
    formData.append('lat', lat);
    formData.append('lng', lng);
    formData.append('is_ppn', is_ppn);
    formData.append('is_public', is_public);
    formData.append('is_active', is_active);
    formData.append('fasilitas', JSON.stringify(fasilitas));
    console.log(fasilitas);
    // Kirim seluruh array foto dan judul dalam 1 JSON string
    formData.append('foto_judul', JSON.stringify(dataFotoJudul));

    // Upload file foto
    dataFotoJudul.forEach((item) => {
        formData.append('foto[]', item.file);
    });

    $.ajax({
        type: "POST",
        url: "<?= base_url('chargebox/simpan') ?>",
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            console.log("Server Response:", response);

            if (response.status === 'success') {
                alert(response.message);
                $('#modaltambah').modal('hide');
                $('#list-data').DataTable().ajax.reload(null, false);
                kosong();
            } else {
                alert("Gagal: " + response.message);
            }
        },
        error: function(xhr, status, error) {
            console.log("Error:", error);
            console.log("Response Text:", xhr.responseText); // Untuk debug
            alert("Terjadi kesalahan saat mengirim data.");
        }
    });
}


	
	function hapus(id){
    if (confirm("Yakin hapus?") == false) return;

    $.ajax({
        type: "POST",
        url: "<?php echo base_url('chargebox/hapusChargebox') ?>", // Ganti sesuai controller
        data: { id_chargebox: id }, // Ganti jadi id_chargebox
        success: function(response){
            console.log("Respon hapus:", response); // DEBUG

            if (response.trim() === "sukses") {
                alert("Data berhasil dihapus");
                var table = $('#list-data').DataTable();
                table.ajax.reload(null, false); // reload data table
            } else {
                alert("Gagal menghapus data!");
            }
        },
        error: function(xhr, status, error) {
            console.error("AJAX Error:", error);
            alert("Terjadi kesalahan saat menghapus data.");
        }
    });
}

// Fungsi untuk mengubah data
function simpanubah() {
    // Validasi form
    if (!$('#chargebox_id').val()) {
        alert('Chargebox ID harus diisi');
        return;
    }
    
   var formData = {
    id: _idubah,
    chargebox_id: $('#chargebox_id').val(),
    nama_chargebox: $('#nama_chargebox').val(),
    id_mitra: $('#id_mitra').val(),
    id_area: $('#id_area').val(),
    vendor: $('#vendor').val(),
    model: $('#model').val(),
    serial_number: $('#serial_number').val(),
    ocpp_protocol: $('#ocpp_protocol').val(),
    jenis: $('#jenis').val(),
    lat: $('#lat').val(),
    lng: $('#lng').val(),
    is_ppn: $('#is_ppn').val(),
    is_public: $('#is_public').val(),
    is_active: $('#is_active').val(),
    fasilitas: JSON.stringify(dataFasilitasUbah),
    foto: JSON.stringify(dataFotoUbah)
};


    // Tampilkan loading
    $('#btn_add').prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Menyimpan...');
    
    $.ajax({
        type: "POST",
        url: "<?php echo base_url('chargebox/simpanubah')?>",
        data: formData,
        dataType: "json",
        success: function(response) {
            $('#btn_add').prop('disabled', false).html('Simpan');
            
            if (response.success) {
                alert('Data berhasil disimpan');
                $('#modalubah').modal('hide');
                $('#list-data').DataTable().ajax.reload();
            } else {
                alert(response.message || 'Gagal menyimpan perubahan');
            }
        },
        error: function(xhr, status, error) {
            $('#btn_add').prop('disabled', false).html('Simpan');
            console.error('Error saat simpanubah:', error);
            alert('Terjadi kesalahan saat menyimpan');
        }
    });
}

function ubah(id) {
    console.log("?? [DEBUG] Memulai fungsi ubah dengan ID:", id);

    const modal = $('#modalubah');
    if (modal.length === 0) {
        console.error("? Modal #modalubah tidak ditemukan di DOM.");
        return;
    }

    $.ajax({
        url: "<?= base_url('chargebox/getdatachargebox'); ?>",
        method: "POST",
        data: { id: id },
        dataType: 'json',
        success: function(data) {
            console.log("? [AJAX Success] Data diterima:", data);
            console.log($('#id_area').html());

            if (data && data.id_chargebox) {
                _idubah = data.id_chargebox;

                // Isi form
               $('#id_chargebox').val(data.id_chargebox);
                $('#chargebox_id').val(data.chargebox_id);
                $('#nama_chargebox').val(data.nama_chargebox);
                $('#jenis').val(data.jenis);
                $('#lat').val(data.lat);
                $('#lng').val(data.lng);
                $('#id_area').val(data.id_area).trigger('change');
                $('#id_mitra').val(data.id_mitra).trigger('change');
                $('#is_ppn').val(data.is_ppn);
                $('#is_public').val(data.is_public);
                $('#is_active').val(data.is_active);
                $('#model').val(data.model);
                $('#serial_number').val(data.serial_number);
                $('#ocpp_protocol').val(data.ocpp_protocol);
                $('#vendor').val(data.vendor);


                dataFasilitasUbah = data.fasilitas ? JSON.parse(data.fasilitas) : [];
                $('#fasilitas').html(renderFasilitasField(dataFasilitasUbah));

                dataFotoUbah = data.foto ? JSON.parse(data.foto) : [];
                $('#foto').html(renderFotoPreview(dataFotoUbah));

                setTimeout(() => {
                  modal.modal('show');
                  console.log("? [DEBUG] Modal ditampilkan");
                }, 300);
            } else {
                alert('Data tidak ditemukan');
            }
        },
        error: function(xhr, status, error) {
            console.error("? [AJAX Error]", status, error);
            alert('Gagal mengambil data');
        }
    });
}

// Fungsi untuk merender fasilitas
function renderFasilitasField(data) {
  let html = '<div class="row">';
  if (data.length === 0) {
    html += '<div class="col-12 text-center text-muted">Belum ada fasilitas</div>';
  }

  data.forEach((item, index) => {
    html += `
      <div class="col-md-3 text-center mb-3" id="fasilitas-${index}">
        <img src="${baseFasilitasUrl}${item.icon}" class="img-thumbnail" style="width: 60px; height: 60px;">
        <div style="font-size: 0.85em; margin-top: 5px;">${item.fasilitas}</div>
        <button class="btn btn-sm btn-danger mt-1" onclick="hapusFasilitasUbah(${index})">Hapus</button>
      </div>`;
  });

  html += '</div>';
  dataFasilitasUbah = data;
  document.getElementById('hidden_fasilitas_ubah').value = JSON.stringify(dataFasilitasUbah);
  return html;
}


function hapusFasilitasUbah(index) {
  const item = dataFasilitasUbah[index];
  if (!confirm('Yakin ingin menghapus fasilitas ini?')) return;

  $.ajax({
    url: BASE_URL + 'chargebox/hapus-fasilitas-tertentu',
    method: 'POST',
    data: {
      id_chargebox: $('#id_chargebox').val(),
      icon: item.icon
    },
    success: function(res) {
      dataFasilitasUbah.splice(index, 1);
      $('#fasilitas').html(renderFasilitasField(dataFasilitasUbah));
    },
    error: function(err) {
      alert('Gagal hapus fasilitas.');
    }
  });
}


function renderFotoPreview(data) {
  let html = '<div class="row">';
  if (data.length === 0) {
    html += '<div class="col-12 text-center text-muted">Belum ada foto</div>';
  }

  data.forEach((item, index) => {
    html += `
      <div class="col-md-4 text-center mb-3" id="foto-${index}">
        <img src="${baseChargeboxUrl}${item.foto}" class="img-thumbnail" style="width: 100%; max-width: 160px;">
        <div style="font-size: 0.85em; margin-top: 5px;">${item.judul}</div>
        <button class="btn btn-sm btn-danger mt-1" onclick="hapusFotoUbah(${index})">Hapus</button>
      </div>`;
  });

  html += '</div>';
  dataFotoUbah = data;
  document.getElementById('hidden_foto_ubah').value = JSON.stringify(dataFotoUbah);
  return html;
}


function hapusFotoUbah(index) {
  const fotoItem = dataFotoUbah[index];
  if (!confirm('Yakin ingin menghapus foto ini?')) return;

  $.ajax({
    url: BASE_URL + 'chargebox/hapus-foto-tertentu',
    method: 'POST',
    data: {
      id_chargebox: $('#id_chargebox').val(),
      foto: fotoItem.foto
    },
    success: function(res) {
      dataFotoUbah.splice(index, 1);
      $('#foto').html(renderFotoPreview(dataFotoUbah));
    },
    error: function(err) {
      alert('Gagal menghapus dari server.');
    }
  });
}

	function getdata(){
		
		var datatable=   $('#list-data').DataTable( {
      
        "processing" : true,
        "oLanguage": {
                "sLengthMenu": "Tampilkan _MENU_ data per halaman",
                "sSearch": "Pencarian: ",
                "sZeroRecords": "Maaf, tidak ada data yang ditemukan",
               "sInfo": "Menampilkan _START_ s/d _END_ dari _TOTAL_ data",
				//"sInfo": "",
                "sInfoEmpty": "Menampilkan 0 s/d 0 dari 0 data",
                "sInfoFiltered": "(di filter dari _MAX_ total data)",
                "oPaginate": {
                    "sFirst": "<<",
                    "sLast": ">>",
                    "sPrevious": "<",
                    "sNext": ">"
               }
            },
  columnDefs: [{
        targets: [0],
        orderable: false
     },
	 {targets: [-1],
         visible: false
     },
	 {targets: [-2],
        "className": "text-center",
     },
	 {targets: [-3],
        "className": "right",
     },
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
	"aaSorting": [[1,'asc']],
    
 
  "ajax":{
          url :"<?php echo base_url('chargebox/datajson'); ?>", // json datasource
          type: "post",
			  // method  , by default get
          
        },

       // <th>ChargeBox ID</th>
          // <th>Nama Chargebox</th>
          // <th>Last Ping</th>
		  // <th>Mitra</th>
          // <th>Area</th>
		  // <th>Alamat</th>
          // <th>Jml.Konektor</th>
		  // <th>Aksi</th>
		
		"columns": [
			
			{ "data": "chargebox_id"},
			{ "data": "nama_chargebox"},
			{ "data": "last_ping"},
			
			{ "data": "mitra"},
			{ "data": "nama_area"},
			{ "data": "alamat"},
			{ "data": "jumkonektor"},
			{ "data": "aksi"},
			{ "data": "id"},
			
			
		]
  
  });
 
	}
	
	function tambahdata(){
		 $('#modaltambah').modal('show');
	}
</script>
