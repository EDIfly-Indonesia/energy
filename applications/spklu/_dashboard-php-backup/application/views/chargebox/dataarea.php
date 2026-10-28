<style>
#right{float:right}
</style>

<div class="msg" style="display:none;">
  <?php echo @$this->session->flashdata('msg'); ?>
</div>

<div class="box">
  <div class="box-body">
    <?php if($access->c) { ?>
      <div class="btn-group" id="right">
        <a href="javascript:void(0);" class="btn btn-primary float-right" onclick="tambaharea();">Tambah</a>
      </div><br><br>
    <?php } ?>

    <div class="table-responsive" style="min-height: 500px;">
      <table id="list-data" class="table table-bordered table-striped">
        <thead>
          <tr>
            <th class="text-center">Nama Area</th>
            <th class="text-center">Alamat</th>
            <th class="text-center">Kode Pos</th>
            <th class="text-center">Kota</th>
            <th class="text-center">Foto</th>
            <th class="text-center">Last Update</th>
            <th class="text-center">Aksi</th>
          </tr>
        </thead>
      </table>
    </div>
  </div>
</div>

<div class="modal fade" id="modaltambah" tabindex="-1" role="dialog" aria-hidden="true">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header bg-primary">
        <h3 class="modal-title text-white">Area Baru</h3>
        <button class="close" type="button" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true" class="text-white">×</span>
        </button>
      </div>

      <div class="modal-body">
        <form id="formTambahArea" enctype="multipart/form-data">
          <div class="form-group">
            <label>Nama Area</label>
            <input type="text" name="nama_area" class="form-control" id="nama_area" placeholder="Nama Area">
          </div>

          <div class="form-group">
            <label>Alamat</label>
            <textarea name="alamat" class="form-control" id="alamat" placeholder="Alamat"></textarea>
          </div>

          <div class="form-group">
            <label>Kode Pos</label>
            <input type="text" name="kode_pos" class="form-control" id="kode_pos" placeholder="Kode Pos">
          </div>

          <div class="form-group">
            <label>Kota</label>
            <input type="text" name="kota" class="form-control" id="kota" placeholder="Kota">
          </div>

          <div class="form-group">
            <label>Foto</label>
            <input type="file" name="foto" class="form-control" id="foto" accept="image/*">
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" type="button" data-dismiss="modal">Batal</button>
        <button class="btn btn-primary" onclick="simpandata();">Simpan</button>
      </div>
    </div>
  </div>
</div>

<div class="modal fade" id="modalubah" tabindex="-1" role="dialog" aria-hidden="true">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header bg-primary">
        <h3 class="modal-title text-white">Ubah Data Area</h3>
        <button class="close" type="button" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true" class="text-white">×</span>
        </button>
      </div>

      <div class="modal-body">
        <form id="formUbahArea" enctype="multipart/form-data">
          <input type="hidden" name="id_area" id="id_area_ubah">

          <div class="form-group">
            <label>Nama Area</label>
            <input type="text" name="nama_area" class="form-control" id="nama_area_ubah" placeholder="Nama Area">
          </div>

          <div class="form-group">
            <label>Alamat</label>
            <textarea name="alamat" class="form-control" id="alamat_ubah" placeholder="Alamat"></textarea>
          </div>

          <div class="form-group">
            <label>Kode Pos</label>
            <input type="text" name="kode_pos" class="form-control" id="kode_pos_ubah" placeholder="Kode Pos">
          </div>

          <div class="form-group">
            <label>Kota</label>
            <input type="text" name="kota" class="form-control" id="kota_ubah" placeholder="Kota">
          </div>

          <div class="form-group">
            <label>Foto</label>
            <input type="file" name="foto" class="form-control" id="foto_ubah" accept="image/*">
            <div id="preview_foto_ubah" style="margin-top:10px;"></div>
            <small class="text-muted">Kosongkan jika foto tidak diubah.</small>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" type="button" data-dismiss="modal">Batal</button>
        <button class="btn btn-primary" onclick="simpanubah();">Simpan</button>
      </div>
    </div>
  </div>
</div>

<div id="tempat-modal"></div>

<script type="text/javascript">
$(document).ready(function() {
  getdata();
});

$('#modaltambah').on('shown.bs.modal', function() {
  $('#nama_area').focus();
});

function tambaharea() {
  kosong();
  $('#modaltambah').modal('show');
}

function kosong() {
  $('#formTambahArea')[0].reset();
}

function kosongubah() {
  $('#formUbahArea')[0].reset();
  $('#preview_foto_ubah').html('');
}

function simpandata() {
  var nama_area = $('#nama_area').val();

  if (nama_area == null || nama_area == "") {
    alert("Nama Area harus diisi!");
    return;
  }

  var formData = new FormData($('#formTambahArea')[0]);

  $.ajax({
    type: "POST",
    url: "<?php echo base_url('chargebox/simpandataarea')?>",
    data: formData,
    processData: false,
    contentType: false,
    dataType: "JSON",
    success: function(response) {
      if (response.status == 'success') {
        $('#list-data').DataTable().draw(false);
        $('#modaltambah').modal('hide');
        kosong();
      } else {
        alert(response.message);
      }
    },
    error: function() {
      alert("Gagal menyimpan data!");
    }
  });
}

function simpanubah() {
  var nama_area = $('#nama_area_ubah').val();

  if (nama_area == null || nama_area == "") {
    alert("Nama Area harus diisi!");
    return;
  }

  var formData = new FormData($('#formUbahArea')[0]);

  $.ajax({
    type: "POST",
    url: "<?php echo base_url('chargebox/simpanubaharea')?>",
    data: formData,
    processData: false,
    contentType: false,
    dataType: "JSON",
    success: function(response) {
      if (response.status == 'success') {
        $('#list-data').DataTable().draw(false);
        $('#modalubah').modal('hide');
        kosongubah();
      } else {
        alert(response.message);
      }
    },
    error: function() {
      alert("Gagal mengubah data!");
    }
  });
}

function hapus(id) {
  if (confirm("Yakin hapus?") == false) return;

  $.ajax({
    type: "POST",
    url: "<?php echo base_url('chargebox/hapusArea')?>",
    data: { id_area: id },
    dataType: "JSON",
    success: function(response) {
      if (response.status == 'success') {
        $('#list-data').DataTable().draw(false);
      } else {
        alert(response.message);
      }
    },
    error: function() {
      alert("Gagal menghapus data!");
    }
  });
}

function ubah(id) {
  kosongubah();

  $.ajax({
    type: "POST",
    url: "<?php echo base_url('chargebox/getdataarea')?>",
    data: { id_area: id },
    dataType: "JSON",
    success: function(data) {
      $('#id_area_ubah').val(data.id_area);
      $('#nama_area_ubah').val(data.nama_area);
      $('#alamat_ubah').val(data.alamat);
      $('#kode_pos_ubah').val(data.kode_pos);
      $('#kota_ubah').val(data.kota);

      if (data.foto) {
        $('#preview_foto_ubah').html('<img src="<?php echo base_url('uploads/area/'); ?>' + data.foto + '" class="img-thumbnail" style="width:120px;height:90px;object-fit:cover;">');
      }

      $('#modalubah').modal('show');
    },
    error: function() {
      alert("Gagal mengambil data!");
    }
  });
}

function getdata() {
  $('#list-data').DataTable({
    "processing": true,
    "serverSide": true,
    "destroy": true,
    "ajax": {
      url: "<?php echo base_url('chargebox/dataareajson'); ?>",
      type: "post"
    },
    "columns": [
      { "data": "nama_area" },
      { "data": "alamat" },
      { "data": "kode_pos" },
      { "data": "kota" },
      { "data": "foto", "orderable": false, "searchable": false },
      { "data": "last_update" },
      { "data": "aksi", "orderable": false, "searchable": false }
    ],
    "columnDefs": [
      { "targets": [4,6], "className": "text-center" }
    ],
    "order": [[0, "asc"]]
  });
}
</script>