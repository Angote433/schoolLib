package com.arnold.autolibrary.util;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Component //spring manage this class
public class BarCodeGenerator {
    //generates qr as image and returns it ass byte array-raw data for the qr
    //size in pixels
    public byte[]generateQrCode(String content,int width,int height)throws WriterException,IOException {

        //tells ZXing how to generate QRCODE
        Map<EncodeHintType,Object>hints = new HashMap<>();
        //handles all characters
        hints.put(EncodeHintType.CHARACTER_SET,"UTF-8");

        /*
        Error correction - qr can still be read even if 30% damaged/covered
        physical stickers can get damaged
         */

        hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.H);
        hints.put(EncodeHintType.MARGIN,1);

        QRCodeWriter qrCodeWriter = new QRCodeWriter();

        //converts the string into qr matrix

        BitMatrix bitMatrix = qrCodeWriter.encode(
                content, BarcodeFormat.QR_CODE, width, height, hints
        );

        //convert to a png image
        ByteArrayOutputStream baous = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(bitMatrix,"PNG",baous);

        return baous.toByteArray();


    }

}
