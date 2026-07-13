package com.arnold.mobileLib.ui.scan

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.arnold.mobileLib.data.model.DistributionRecord
import com.arnold.mobileLib.databinding.ItemReturnCandidateBinding

class ReturnCandidatesAdapter(
    private val onReturn: (DistributionRecord) -> Unit
) : ListAdapter<DistributionRecord,
        ReturnCandidatesAdapter.CandidateViewHolder>(DiffCallback()) {

    override fun onCreateViewHolder(
        parent: ViewGroup, viewType: Int
    ): CandidateViewHolder {
        val binding = ItemReturnCandidateBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return CandidateViewHolder(binding)
    }

    override fun onBindViewHolder(
        holder: CandidateViewHolder, position: Int
    ) {
        holder.bind(getItem(position))
    }

    inner class CandidateViewHolder(
        private val binding: ItemReturnCandidateBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(record: DistributionRecord) {
            binding.tvCandidateName.text =
                record.student?.fullName ?: "Unknown Student"
            binding.tvCandidateMeta.text =
                "${record.student?.admissionNumber ?: ""} • Issued: ${record.dateDistributed}"

            binding.btnCandidateReturn.setOnClickListener {
                onReturn(record)
            }
        }
    }

    class DiffCallback : DiffUtil.ItemCallback<DistributionRecord>() {
        override fun areItemsTheSame(
            old: DistributionRecord, new: DistributionRecord
        ) = old.distributionId == new.distributionId
        override fun areContentsTheSame(
            old: DistributionRecord, new: DistributionRecord
        ) = old == new
    }
}
