package com.arnold.mobileLib.ui.distributions

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.arnold.mobileLib.data.model.DistributionRecord
import com.arnold.mobileLib.databinding.ItemDistributionBinding

class DistributionsAdapter(
    private val onFlagLost: (DistributionRecord) -> Unit
) : ListAdapter<DistributionRecord,
        DistributionsAdapter.DistributionViewHolder>(DiffCallback()) {

    override fun onCreateViewHolder(
        parent: ViewGroup, viewType: Int
    ): DistributionViewHolder {
        val binding = ItemDistributionBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return DistributionViewHolder(binding)
    }

    override fun onBindViewHolder(
        holder: DistributionViewHolder, position: Int
    ) {
        holder.bind(getItem(position))
    }

    inner class DistributionViewHolder(
        private val binding: ItemDistributionBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(record: DistributionRecord) {
            binding.tvDistBookTitle.text =
                record.bookCopy?.bookDetails?.titleName
                    ?: "Unknown Book"
            binding.tvDistBarcode.text =
                record.bookCopy?.qrCode ?: ""
            binding.tvDistStudentName.text =
                record.student?.fullName ?: "Unknown Student"
            binding.tvDistDate.text =
                "Issued: ${record.dateDistributed}"

            binding.btnFlagLost.setOnClickListener {
                onFlagLost(record)
            }
        }
    }

    class DiffCallback :
        DiffUtil.ItemCallback<DistributionRecord>() {
        override fun areItemsTheSame(
            old: DistributionRecord, new: DistributionRecord
        ) = old.distributionId == new.distributionId
        override fun areContentsTheSame(
            old: DistributionRecord, new: DistributionRecord
        ) = old == new
    }
}