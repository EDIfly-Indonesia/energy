#!/bin/bash
#Log Rotation Script untuk PM2 Logs

LOG_DIRS=(
    "/opt/energy/applications/plts/backend/logs"
    "/opt/energy/applications/plts/backend/backend/logs"
)
MAX_SIZE="100M"  # Maksimum ukuran sebelum rotasi
KEEP=3  # Simpan 3 file log lama

for dir in "${LOG_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        for logfile in "$dir"/*.log; do
            if [ -f "$logfile" ]; then
                # Gunakan logrotate jika tersedia, alternatif manual jika tidak
                size=$(du -h "$logfile" | cut -f1)
                echo "Log: $logfile - Size: $size"

                # Jika lebih besar dari 100M, lakukan rotasi manual
                if [ "$(stat -f%b "$logfile")" -gt "$(echo "$MAX_SIZE" | sed 's/M/10241024/' | bc)" ]; then
                    echo "Rotating $logfile"
                    # Compress log yang ada
                    current_time=$(date +%Y%m%d_%H%M%S)
                    gzip "$logfile"
                    mv "${logfile}.gz" "${logfile}.${current_time}.gz"

                    # Buat file log baru dengan permission yang benar
                    touch "$logfile"
                    chmod 644 "$logfile"

                    # Hapus log lama yang melebihi KEEP
                    ls -1t "${logfile}".*.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs rm -f

                    # Restart PM2 agar mengenali file log baru
                    pm2 restart all > /dev/null 2>&1 || true
                fi
            fi
        done
    fi
done
